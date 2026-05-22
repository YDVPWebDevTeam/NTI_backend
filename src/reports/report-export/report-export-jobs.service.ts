import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { FilesService } from '../../files/files.service';
import type { DownloadUrlDto } from '../../files/dto/download-url.dto';
import type { UploadedFileDto } from '../../files/dto/uploaded-file.dto';
import { ConfigService } from '../../infrastructure/config';
import { ExportJobStatusDto } from '../dto/export-job-status.dto';
import { ReportExportJobsRepository } from './report-export-jobs.repository';
import {
  REPORT_DOWNLOAD_ROUTE_TEMPLATE,
  type ReportDataset,
  type ReportFormat,
} from '../reports.constants';

type CompletedExportFileInput = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
};

type ReportExportJobRecord = {
  id: string;
  requestedByUserId: string;
  dataset: string;
  format: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
  uploadedFileId: string | null;
  downloadTokenHash: string | null;
  downloadTokenExpiresAt: Date | null;
};

type DownloadTokenJob = Pick<
  ReportExportJobRecord,
  | 'id'
  | 'requestedByUserId'
  | 'uploadedFileId'
  | 'downloadTokenHash'
  | 'downloadTokenExpiresAt'
>;

@Injectable()
export class ReportExportJobsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly reportExportJobsRepository: ReportExportJobsRepository,
    private readonly filesService: FilesService,
  ) {}

  async createJob(
    actor: AuthenticatedUserContext,
    dataset: ReportDataset,
    format: ReportFormat,
  ): Promise<{ id: string }> {
    const id = randomUUID();

    await this.reportExportJobsRepository.create({
      id,
      requestedByUserId: actor.id,
      dataset,
      format,
      status: 'PENDING',
    });

    return { id };
  }

  async markProcessing(id: string): Promise<void> {
    await this.requireJob(id);
    await this.reportExportJobsRepository.update(
      { id },
      {
        status: 'PROCESSING',
        errorMessage: null,
      },
    );
  }

  async markCompleted(
    id: string,
    input: CompletedExportFileInput,
  ): Promise<void> {
    const job: ReportExportJobRecord = await this.requireJob(id);

    const uploadedFile: UploadedFileDto =
      await this.filesService.createServerGeneratedFileForOwner(
        job.requestedByUserId,
        {
          filename: input.fileName,
          mimeType: input.contentType,
          buffer: input.buffer,
          purpose: 'report-export',
          entityType: 'report_export_job',
          entityId: id,
        },
      );

    await this.reportExportJobsRepository.update(
      { id },
      {
        status: 'COMPLETED',
        completedAt: new Date(),
        errorMessage: null,
        uploadedFileId: uploadedFile.id,
        downloadTokenHash: null,
        downloadTokenExpiresAt: null,
      },
    );
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.requireJob(id);
    await this.reportExportJobsRepository.update(
      { id },
      {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage,
        downloadTokenHash: null,
        downloadTokenExpiresAt: null,
      },
    );
  }

  async getStatus(
    actor: AuthenticatedUserContext,
    id: string,
  ): Promise<ExportJobStatusDto> {
    const job: ReportExportJobRecord = await this.requireOwnedJob(actor, id);
    const base: ExportJobStatusDto = {
      id: job.id,
      status: job.status,
      dataset: job.dataset,
      format: job.format,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      errorMessage: job.errorMessage ?? undefined,
    };

    if (job.status !== 'COMPLETED' || !job.uploadedFileId) {
      return base;
    }

    const { token, expiresAt } = await this.getOrRefreshDownloadToken(job);

    return {
      ...base,
      downloadUrl: REPORT_DOWNLOAD_ROUTE_TEMPLATE.replace(
        '{id}',
        job.id,
      ).replace('{token}', token),
      downloadUrlExpiresAt: expiresAt.toISOString(),
    };
  }

  async resolveDownload(
    actor: AuthenticatedUserContext,
    id: string,
    token: string | undefined,
  ): Promise<{ downloadUrl: string }> {
    const job: ReportExportJobRecord = await this.requireOwnedJob(actor, id);

    if (job.status !== 'COMPLETED' || !job.uploadedFileId) {
      throw new NotFoundException('Export file is not available');
    }

    if (!token?.trim()) {
      throw new ForbiddenException('Download token is invalid or expired');
    }

    if (
      !job.downloadTokenHash ||
      !job.downloadTokenExpiresAt ||
      job.downloadTokenExpiresAt.getTime() <= Date.now() ||
      job.downloadTokenHash !== this.hashToken(token)
    ) {
      throw new ForbiddenException('Download token is invalid or expired');
    }

    const file: DownloadUrlDto = await this.filesService.requestDownloadUrl(
      actor,
      job.uploadedFileId,
      'attachment',
    );

    return {
      downloadUrl: file.downloadUrl,
    };
  }

  private async requireOwnedJob(
    actor: AuthenticatedUserContext,
    id: string,
  ): Promise<ReportExportJobRecord> {
    const job: unknown =
      await this.reportExportJobsRepository.findSelectedByIdForOwner(
        id,
        actor.id,
      );

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    return job as ReportExportJobRecord;
  }

  private async requireJob(id: string): Promise<ReportExportJobRecord> {
    const job: unknown =
      await this.reportExportJobsRepository.findSelectedById(id);

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    return job as ReportExportJobRecord;
  }

  private async getOrRefreshDownloadToken(job: DownloadTokenJob): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const currentToken = this.resolveReusableDownloadToken(job);

    if (currentToken) {
      return currentToken;
    }

    const expiresAt = new Date(
      Date.now() + this.configService.fileDownloadPresignExpiresSeconds * 1000,
    );
    const token = this.buildDownloadToken(job, expiresAt);

    await this.reportExportJobsRepository.update(
      { id: job.id },
      {
        downloadTokenHash: this.hashToken(token),
        downloadTokenExpiresAt: expiresAt,
      },
    );

    return { token, expiresAt };
  }

  private resolveReusableDownloadToken(
    job: DownloadTokenJob,
  ): { token: string; expiresAt: Date } | null {
    if (
      !job.uploadedFileId ||
      !job.downloadTokenHash ||
      !job.downloadTokenExpiresAt ||
      job.downloadTokenExpiresAt.getTime() <= Date.now()
    ) {
      return null;
    }

    const token = this.buildDownloadToken(job, job.downloadTokenExpiresAt);

    if (this.hashToken(token) !== job.downloadTokenHash) {
      return null;
    }

    return {
      token,
      expiresAt: job.downloadTokenExpiresAt,
    };
  }

  private buildDownloadToken(
    job: Pick<
      ReportExportJobRecord,
      'id' | 'requestedByUserId' | 'uploadedFileId'
    >,
    expiresAt: Date,
  ): string {
    return createHmac('sha256', this.configService.jwtAccessSecret)
      .update(job.id)
      .update(':')
      .update(job.requestedByUserId)
      .update(':')
      .update(job.uploadedFileId ?? '')
      .update(':')
      .update(expiresAt.toISOString())
      .digest('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

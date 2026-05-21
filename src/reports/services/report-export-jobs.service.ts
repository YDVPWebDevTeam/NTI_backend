import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { FilesService } from '../../files/files.service';
import { ConfigService } from '../../infrastructure/config';
import { ExportJobStatusDto } from '../dto/export-job-status.dto';
import { ReportExportJobsRepository } from '../repositories/report-export-jobs.repository';
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
    const job = await this.requireJob(id);

    const uploadedFile =
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
    const job = await this.requireOwnedJob(actor, id);
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

    const { token, expiresAt } = await this.refreshDownloadToken(job.id);

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
    token: string,
  ): Promise<{ downloadUrl: string }> {
    const job = await this.requireOwnedJob(actor, id);

    if (job.status !== 'COMPLETED' || !job.uploadedFileId) {
      throw new NotFoundException('Export file is not available');
    }

    if (
      !job.downloadTokenHash ||
      !job.downloadTokenExpiresAt ||
      job.downloadTokenExpiresAt.getTime() <= Date.now() ||
      job.downloadTokenHash !== this.hashToken(token)
    ) {
      throw new ForbiddenException('Download token is invalid or expired');
    }

    const file = await this.filesService.requestDownloadUrl(
      actor,
      job.uploadedFileId,
      'attachment',
    );

    return {
      downloadUrl: file.downloadUrl,
    };
  }

  private async requireOwnedJob(actor: AuthenticatedUserContext, id: string) {
    const job = await this.reportExportJobsRepository.findSelectedByIdForOwner(
      id,
      actor.id,
    );

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    return job;
  }

  private async requireJob(id: string) {
    const job = await this.reportExportJobsRepository.findSelectedById(id);

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    return job;
  }

  private async refreshDownloadToken(id: string): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(
      Date.now() + this.configService.fileDownloadPresignExpiresSeconds * 1000,
    );

    await this.reportExportJobsRepository.update(
      { id },
      {
        downloadTokenHash: this.hashToken(token),
        downloadTokenExpiresAt: expiresAt,
      },
    );

    return { token, expiresAt };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

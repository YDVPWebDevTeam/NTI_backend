import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { ConfigService } from '../infrastructure/config';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ExportJobStatusDto } from './dto/export-job-status.dto';
import {
  REPORT_DOWNLOAD_ROUTE_TEMPLATE,
  type ExportJobStatus,
  type ReportDataset,
  type ReportFormat,
} from './reports.constants';

type ExportJobRecord = {
  id: string;
  requestedByUserId: string;
  dataset: ReportDataset;
  format: ReportFormat;
  status: ExportJobStatus;
  createdAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
  buffer: Buffer | null;
  fileName: string | null;
  contentType: string | null;
  downloadToken: string | null;
  downloadTokenExpiresAt: Date | null;
};

@Injectable()
export class ReportExportJobsService {
  private readonly jobs = new Map<string, ExportJobRecord>();

  constructor(private readonly configService: ConfigService) {}

  createJob(
    actor: AuthenticatedUserContext,
    dataset: ReportDataset,
    format: ReportFormat,
  ): ExportJobRecord {
    const job: ExportJobRecord = {
      id: randomUUID(),
      requestedByUserId: actor.id,
      dataset,
      format,
      status: 'PENDING',
      createdAt: new Date(),
      completedAt: null,
      errorMessage: null,
      buffer: null,
      fileName: null,
      contentType: null,
      downloadToken: null,
      downloadTokenExpiresAt: null,
    };

    this.jobs.set(job.id, job);

    return job;
  }

  markProcessing(id: string): void {
    const job = this.requireJob(id);
    job.status = 'PROCESSING';
  }

  markCompleted(
    id: string,
    input: { buffer: Buffer; fileName: string; contentType: string },
  ): void {
    const job = this.requireJob(id);
    job.status = 'COMPLETED';
    job.completedAt = new Date();
    job.buffer = input.buffer;
    job.fileName = input.fileName;
    job.contentType = input.contentType;
  }

  markFailed(id: string, errorMessage: string): void {
    const job = this.requireJob(id);
    job.status = 'FAILED';
    job.completedAt = new Date();
    job.errorMessage = errorMessage;
  }

  getStatus(actor: AuthenticatedUserContext, id: string): ExportJobStatusDto {
    const job = this.requireOwnedJob(actor, id);
    const base: ExportJobStatusDto = {
      id: job.id,
      status: job.status,
      dataset: job.dataset,
      format: job.format,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      errorMessage: job.errorMessage ?? undefined,
    };

    if (job.status !== 'COMPLETED') {
      return base;
    }

    const token = this.ensureDownloadToken(job);

    return {
      ...base,
      downloadUrl: REPORT_DOWNLOAD_ROUTE_TEMPLATE.replace(
        '{id}',
        job.id,
      ).replace('{token}', token),
      downloadUrlExpiresAt: job.downloadTokenExpiresAt?.toISOString(),
    };
  }

  resolveDownload(
    actor: AuthenticatedUserContext,
    id: string,
    token: string,
  ): { buffer: Buffer; fileName: string; contentType: string } {
    const job = this.requireOwnedJob(actor, id);

    if (
      job.status !== 'COMPLETED' ||
      !job.buffer ||
      !job.fileName ||
      !job.contentType
    ) {
      throw new NotFoundException('Export file is not available');
    }

    if (
      !job.downloadToken ||
      !job.downloadTokenExpiresAt ||
      job.downloadToken !== token ||
      job.downloadTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new ForbiddenException('Download token is invalid or expired');
    }

    return {
      buffer: job.buffer,
      fileName: job.fileName,
      contentType: job.contentType,
    };
  }

  private requireOwnedJob(
    actor: AuthenticatedUserContext,
    id: string,
  ): ExportJobRecord {
    const job = this.requireJob(id);

    if (job.requestedByUserId !== actor.id) {
      throw new NotFoundException('Export job not found');
    }

    return job;
  }

  private requireJob(id: string): ExportJobRecord {
    const job = this.jobs.get(id);

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    return job;
  }

  private ensureDownloadToken(job: ExportJobRecord): string {
    if (
      job.downloadToken &&
      job.downloadTokenExpiresAt &&
      job.downloadTokenExpiresAt.getTime() > Date.now()
    ) {
      return job.downloadToken;
    }

    job.downloadToken = randomBytes(24).toString('hex');
    job.downloadTokenExpiresAt = new Date(
      Date.now() + this.configService.fileDownloadPresignExpiresSeconds * 1000,
    );

    return job.downloadToken;
  }
}

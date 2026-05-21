import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../infrastructure/queue';
import {
  REPORT_EXPORT_JOBS,
  type ReportExportJobData,
  type ReportExportJobName,
  type ReportExportJobResult,
} from '../../infrastructure/queue';
import { ReportExportQueryDto } from '../dto/report-export-query.dto';
import { ReportsService } from '../reports.service';

@Processor(QUEUE_NAMES.REPORTS)
export class ReportExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportExportProcessor.name);

  constructor(private readonly reportsService: ReportsService) {
    super();
  }

  async process(
    job: Job<ReportExportJobData[ReportExportJobName]>,
  ): Promise<ReportExportJobResult[ReportExportJobName]> {
    if (job.name !== REPORT_EXPORT_JOBS.GENERATE) {
      throw new Error(`No handler found for report export job: ${job.name}`);
    }

    const { exportJobId, query } = job.data;

    try {
      await this.reportsService.executeAsyncExportJob(
        exportJobId,
        query as ReportExportQueryDto,
      );

      return { exportJobId };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Export job failed';

      await this.reportsService.failAsyncExportJob(exportJobId, message);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ReportExportJobData[ReportExportJobName]>): void {
    this.logger.log(`Completed report export job "${job.name}" (${job.id})`);
  }

  @OnWorkerEvent('failed')
  onFailed(
    job: Job<ReportExportJobData[ReportExportJobName]> | undefined,
    error: Error,
  ): void {
    const jobName = job?.name ?? 'unknown';
    const jobId = job?.id ?? 'unknown';

    this.logger.error(
      `Failed report export job "${jobName}" (${jobId}): ${error.message}`,
      error.stack,
    );
  }
}

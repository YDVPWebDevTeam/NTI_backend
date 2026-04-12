import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '../../config';
import { PdfService, PdfTemplateRegistryService } from '../../pdf';
import { QUEUE_NAMES } from '../queue.constants';
import { PDF_JOBS } from '../queue.types';
import type { PdfJobData, PdfJobName, PdfJobResult } from '../queue.types';

type PdfJobHandlers = {
  [K in PdfJobName]: (data: PdfJobData[K]) => Promise<PdfJobResult[K]>;
};

@Processor(QUEUE_NAMES.PDF)
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);
  readonly workerOptions: { concurrency: number };

  constructor(
    private readonly configService: ConfigService,
    private readonly pdfService: PdfService,
    private readonly pdfTemplateRegistry: PdfTemplateRegistryService,
  ) {
    super();
    this.workerOptions = {
      concurrency: this.configService.pdfWorkerConcurrency,
    };
  }

  private readonly handlers: PdfJobHandlers = {
    [PDF_JOBS.RENDER_TEMPLATE]: async (data) => {
      const html = this.pdfTemplateRegistry.render(data.template, data.data);
      const pdf = await this.pdfService.generateFromHtml({
        html,
        options: data.options,
      });

      return {
        contentType: 'application/pdf',
        bufferBase64: pdf.toString('base64'),
        fileName: this.pdfTemplateRegistry.getFileName(data.template),
      };
    },
  };

  async process(
    job: Job<PdfJobData[PdfJobName]>,
  ): Promise<PdfJobResult[PdfJobName]> {
    const handler = this.handlers[job.name as PdfJobName];

    if (!handler) {
      throw new Error(`No handler found for job: ${job.name}`);
    }

    this.logger.log(`Processing PDF job "${job.name}" (${job.id})`);
    return handler(job.data as never);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<PdfJobData[PdfJobName]>): void {
    this.logger.log(`Completed PDF job "${job.name}" (${job.id})`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<PdfJobData[PdfJobName]> | undefined, error: Error): void {
    const jobName = job?.name ?? 'unknown';
    const jobId = job?.id ?? 'unknown';
    this.logger.error(
      `Failed PDF job "${jobName}" (${jobId}): ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error): void {
    this.logger.error(`PDF worker error: ${error.message}`, error.stack);
  }
}

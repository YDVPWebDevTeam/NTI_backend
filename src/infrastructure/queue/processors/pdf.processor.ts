import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '../../config';
import { PdfService, PdfTemplateRegistryService } from '../../pdf';
import { QUEUE_NAMES } from '../queue.constants';
import { PDF_JOBS } from '../queue.types';
import type { PdfJobData, PdfJobName, PdfJobResult } from '../queue.types';
import {
  logJobCompleted,
  logJobFailed,
  logWorkerError,
  resolveJobHandler,
} from './queue-processor.helpers';

const PDF_JOB_LABEL = 'PDF';

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
    const handler = resolveJobHandler(this.handlers, job.name, PDF_JOB_LABEL);

    this.logger.log(`Processing PDF job "${job.name}" (${job.id})`);
    return handler(job.data as never);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<PdfJobData[PdfJobName]>): void {
    logJobCompleted(this.logger, PDF_JOB_LABEL, job);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<PdfJobData[PdfJobName]> | undefined, error: Error): void {
    logJobFailed(this.logger, PDF_JOB_LABEL, job, error);
  }

  @OnWorkerEvent('error')
  onError(error: Error): void {
    logWorkerError(this.logger, PDF_JOB_LABEL, error);
  }
}

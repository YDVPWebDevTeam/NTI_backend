import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { ConfigService } from '../config';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { createQueueConnection } from '../queue/queue.connection';
import {
  PDF_JOBS,
  type PdfJobResult,
  type PdfTemplateDataByName,
  type PdfTemplateName,
} from '../queue/queue.types';
import type { PdfTemplateRenderOptions } from './pdf.types';

@Injectable()
export class PdfQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfQueueService.name);
  private readonly queueEvents: QueueEvents;
  private readonly queueEventsReadyPromise: Promise<unknown>;

  constructor(
    @InjectQueue(QUEUE_NAMES.PDF) private readonly pdfQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.queueEvents = new QueueEvents(QUEUE_NAMES.PDF, {
      connection: createQueueConnection(this.configService),
    });
    this.queueEventsReadyPromise = this.queueEvents.waitUntilReady();
  }

  async renderTemplate<K extends PdfTemplateName>(
    template: K,
    data: PdfTemplateDataByName[K],
    options?: PdfTemplateRenderOptions,
  ): Promise<Buffer> {
    await this.queueEventsReadyPromise;

    const job = await this.pdfQueue.add(PDF_JOBS.RENDER_TEMPLATE, {
      template,
      data,
      options,
    });

    const result = (await job.waitUntilFinished(
      this.queueEvents,
      this.configService.pdfJobWaitTimeoutMs,
    )) as PdfJobResult[typeof PDF_JOBS.RENDER_TEMPLATE];

    return Buffer.from(result.bufferBase64, 'base64');
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.queueEvents.close();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to close PDF queue events cleanly: ${message}`);
    }
  }
}

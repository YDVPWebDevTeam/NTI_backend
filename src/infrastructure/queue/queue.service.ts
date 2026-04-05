import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants';
import {
  EmailJobData,
  EmailJobName,
  PdfJobData,
  PdfJobName,
} from './queue.types';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PDF) private readonly pdfQueue: Queue,
  ) {}

  addEmail<K extends EmailJobName>(
    jobName: K,
    data: EmailJobData[K],
    opts?: JobsOptions,
  ) {
    return this.emailQueue.add(jobName, data, opts);
  }

  addPdf<K extends PdfJobName>(
    jobName: K,
    data: PdfJobData[K],
    opts?: JobsOptions,
  ) {
    return this.pdfQueue.add(jobName, data, opts);
  }
}

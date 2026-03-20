import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants.js';
import { EmailJobData, EmailJobName } from './queue.types.js';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
  ) {}

  addEmail<K extends EmailJobName>(
    jobName: K,
    data: EmailJobData[K],
    opts?: JobsOptions,
  ) {
    return this.emailQueue.add(jobName, data, opts);
  }
}

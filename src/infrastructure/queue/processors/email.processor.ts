import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants.js';
import { EMAIL_JOBS, EmailJobData, EmailJobName } from '../queue.types.js';

type EmailJobHandlers = {
  [K in EmailJobName]: (data: EmailJobData[K]) => Promise<void>;
};

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly handlers: EmailJobHandlers = {
    // eslint-disable-next-line @typescript-eslint/require-await
    [EMAIL_JOBS.WELCOME]: async (data) => {
      console.log('[EmailProcessor] Sending welcome email:', data);
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    [EMAIL_JOBS.PASSWORD_RESET]: async (data) => {
      console.log('[EmailProcessor] Sending password reset email:', data);
    },
  };

  async process(job: Job<EmailJobData[EmailJobName]>): Promise<void> {
    const handler = this.handlers[job.name as EmailJobName];
    await handler(job.data as never);
  }
}

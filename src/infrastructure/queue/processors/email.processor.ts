import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { EMAIL_JOBS, EmailJobData, EmailJobName } from '../queue.types';
import { MailerService } from '../../mailer/mailer.service';

type EmailJobHandlers = {
  [K in EmailJobName]: (data: EmailJobData[K]) => Promise<void>;
};

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  constructor(private readonly mailerService: MailerService) {
    super();
  }

  private readonly handlers: EmailJobHandlers = {
    [EMAIL_JOBS.USER_CONFIRMATION]: async (data) => {
      await this.mailerService.sendConfirmationEmail(data.email, data.token);
    },
    [EMAIL_JOBS.TEAM_CONFIRMATION]: async (data) => {
      await this.mailerService.sendTeamConfirm(
        data.email,
        data.teamName,
        data.token,
      );
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    [EMAIL_JOBS.PASSWORD_RESET]: async (data) => {
      console.log('[EmailProcessor] Sending password reset email:', data);
    },
  };

  async process(job: Job<EmailJobData[EmailJobName]>): Promise<void> {
    const handler = this.handlers[job.name as EmailJobName];

    if (!handler) {
      throw new Error(`No handler found for job: ${job.name}`);
    }
    await handler(job.data as never);
  }
}

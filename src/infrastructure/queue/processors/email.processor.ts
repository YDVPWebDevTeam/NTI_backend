import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { EMAIL_JOBS, EmailJobData, EmailJobName } from '../queue.types';
import { MailerService } from '../../mailer/mailer.service';

type EmailJobHandlers = {
  [K in EmailJobName]: (data: EmailJobData[K]) => Promise<void>;
};

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

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
    [EMAIL_JOBS.SYSTEM_INVITE_SENT]: async (data) => {
      await this.mailerService.sendSystemInvite(
        data.email,
        data.token,
        data.roleToAssign,
      );
    },
    [EMAIL_JOBS.PASSWORD_RESET]: async (data) => {
      await this.mailerService.sendPasswordResetEmail(data.email, data.token);
    },
  };

  async process(job: Job<EmailJobData[EmailJobName]>): Promise<void> {
    const handler = this.handlers[job.name as EmailJobName];

    if (!handler) {
      throw new Error(`No handler found for job: ${job.name}`);
    }

    this.logger.log(`Processing email job "${job.name}" (${job.id})`);
    await handler(job.data as never);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<EmailJobData[EmailJobName]>): void {
    this.logger.log(`Completed email job "${job.name}" (${job.id})`);
  }

  @OnWorkerEvent('failed')
  onFailed(
    job: Job<EmailJobData[EmailJobName]> | undefined,
    error: Error,
  ): void {
    const jobName = job?.name ?? 'unknown';
    const jobId = job?.id ?? 'unknown';
    this.logger.error(
      `Failed email job "${jobName}" (${jobId}): ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error): void {
    this.logger.error(`Email worker error: ${error.message}`, error.stack);
  }
}

jest.mock('../../mailer/mailer.service', () => ({
  MailerService: class MailerService {},
}));

import { Job } from 'bullmq';
import { EMAIL_JOBS } from '../queue.types';
import { MailerService } from '../../mailer/mailer.service';
import { EmailProcessor } from './email.processor';

type EmailProcessorJob = Parameters<EmailProcessor['process']>[0];

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let mailerService: {
    sendConfirmationEmail: jest.Mock;
    sendTeamConfirm: jest.Mock;
    sendPasswordResetEmail: jest.Mock;
  };

  beforeEach(() => {
    mailerService = {
      sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
      sendTeamConfirm: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    processor = new EmailProcessor(mailerService as unknown as MailerService);
  });

  it('routes TEAM_INVITATION jobs to sendTeamConfirm', async () => {
    const job: EmailProcessorJob = {
      id: 'job-1',
      name: EMAIL_JOBS.TEAM_INVITATION,
      data: {
        email: 'invitee@example.com',
        teamName: 'Alpha Team',
        token: 'invite-token',
      },
    } as Job<
      {
        email: string;
        teamName: string;
        token: string;
      },
      void,
      typeof EMAIL_JOBS.TEAM_INVITATION
    >;

    await processor.process(job);

    expect(mailerService.sendTeamConfirm).toHaveBeenCalledWith(
      'invitee@example.com',
      'Alpha Team',
      'invite-token',
    );
  });

  it('keeps the TEAM_CONFIRMATION handler unchanged', async () => {
    const job: EmailProcessorJob = {
      id: 'job-2',
      name: EMAIL_JOBS.TEAM_CONFIRMATION,
      data: {
        email: 'invitee@example.com',
        teamName: 'Alpha Team',
        token: 'confirm-token',
      },
    } as Job<
      {
        email: string;
        teamName: string;
        token: string;
      },
      void,
      typeof EMAIL_JOBS.TEAM_CONFIRMATION
    >;

    await processor.process(job);

    expect(mailerService.sendTeamConfirm).toHaveBeenCalledWith(
      'invitee@example.com',
      'Alpha Team',
      'confirm-token',
    );
  });
});

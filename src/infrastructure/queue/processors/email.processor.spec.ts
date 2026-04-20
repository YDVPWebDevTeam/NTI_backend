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
    sendOrgPendingReviewEmail: jest.Mock;
    sendOrgApprovedEmail: jest.Mock;
    sendOrgRejectedEmail: jest.Mock;
  };

  beforeEach(() => {
    mailerService = {
      sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
      sendTeamConfirm: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendOrgPendingReviewEmail: jest.fn().mockResolvedValue(undefined),
      sendOrgApprovedEmail: jest.fn().mockResolvedValue(undefined),
      sendOrgRejectedEmail: jest.fn().mockResolvedValue(undefined),
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

  it('sends ORG_PENDING_REVIEW to all provided admin emails', async () => {
    const job: EmailProcessorJob = {
      id: 'job-3',
      name: EMAIL_JOBS.ORG_PENDING_REVIEW,
      data: {
        organizationId: 'org-1',
        adminEmails: ['admin1@example.com', 'admin2@example.com'],
      },
    } as Job<
      {
        organizationId: string;
        adminEmails: string[];
      },
      void,
      typeof EMAIL_JOBS.ORG_PENDING_REVIEW
    >;

    await processor.process(job);

    expect(mailerService.sendOrgPendingReviewEmail).toHaveBeenNthCalledWith(
      1,
      'admin1@example.com',
      'org-1',
    );
    expect(mailerService.sendOrgPendingReviewEmail).toHaveBeenNthCalledWith(
      2,
      'admin2@example.com',
      'org-1',
    );
  });

  it('sends ORG_APPROVED to all provided owner emails', async () => {
    const job: EmailProcessorJob = {
      id: 'job-4',
      name: EMAIL_JOBS.ORG_APPROVED,
      data: {
        organizationId: 'org-1',
        organizationName: 'Acme Labs s.r.o.',
        ownerEmails: ['owner1@example.com', 'owner2@example.com'],
      },
    } as Job<
      {
        organizationId: string;
        organizationName: string;
        ownerEmails: string[];
      },
      void,
      typeof EMAIL_JOBS.ORG_APPROVED
    >;

    await processor.process(job);

    expect(mailerService.sendOrgApprovedEmail).toHaveBeenNthCalledWith(
      1,
      'owner1@example.com',
      'org-1',
      'Acme Labs s.r.o.',
    );
    expect(mailerService.sendOrgApprovedEmail).toHaveBeenNthCalledWith(
      2,
      'owner2@example.com',
      'org-1',
      'Acme Labs s.r.o.',
    );
  });

  it('sends ORG_REJECTED to all provided owner emails', async () => {
    const job: EmailProcessorJob = {
      id: 'job-5',
      name: EMAIL_JOBS.ORG_REJECTED,
      data: {
        organizationId: 'org-1',
        organizationName: 'Acme Labs s.r.o.',
        ownerEmails: ['owner1@example.com', 'owner2@example.com'],
        rejectionReason: 'Missing legal documents',
      },
    } as Job<
      {
        organizationId: string;
        organizationName: string;
        ownerEmails: string[];
        rejectionReason: string;
      },
      void,
      typeof EMAIL_JOBS.ORG_REJECTED
    >;

    await processor.process(job);

    expect(mailerService.sendOrgRejectedEmail).toHaveBeenNthCalledWith(
      1,
      'owner1@example.com',
      'org-1',
      'Acme Labs s.r.o.',
      'Missing legal documents',
    );
    expect(mailerService.sendOrgRejectedEmail).toHaveBeenNthCalledWith(
      2,
      'owner2@example.com',
      'org-1',
      'Acme Labs s.r.o.',
      'Missing legal documents',
    );
  });
});

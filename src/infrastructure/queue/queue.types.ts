import { UserRole } from '../../../generated/prisma/enums';

export const EMAIL_JOBS = {
  PASSWORD_RESET: 'password-reset',
  USER_CONFIRMATION: 'user-confirmation',
  TEAM_CONFIRMATION: 'team-confirmation',
  SYSTEM_INVITE_SENT: 'system-invite-sent',
  ORG_PENDING_REVIEW: 'org-pending-review',
  ORG_INVITE: 'org-invite',
  TEAM_INVITATION: 'team-invitation',
} as const;

export type EmailJobName = (typeof EMAIL_JOBS)[keyof typeof EMAIL_JOBS];

export interface EmailJobData {
  [EMAIL_JOBS.PASSWORD_RESET]: { userId: string; email: string; token: string };
  [EMAIL_JOBS.USER_CONFIRMATION]: { email: string; token: string };
  [EMAIL_JOBS.TEAM_CONFIRMATION]: {
    email: string;
    teamName: string;
    token: string;
  };
  [EMAIL_JOBS.SYSTEM_INVITE_SENT]: {
    email: string;
    token: string;
    roleToAssign: UserRole;
  };
  [EMAIL_JOBS.TEAM_INVITATION]: {
    email: string;
    teamName: string;
    token: string;
  };
  [EMAIL_JOBS.ORG_PENDING_REVIEW]: {
    organizationId: string;
    adminEmails: string[];
  };
  [EMAIL_JOBS.ORG_INVITE]: {
    email: string;
    token: string;
    organizationId: string;
  };
}

import { UserRole } from '../../../generated/prisma/enums';

export const EMAIL_JOBS = {
  PASSWORD_RESET: 'password-reset',
  USER_CONFIRMATION: 'user-confirmation',
  TEAM_CONFIRMATION: 'team-confirmation',
  SYSTEM_INVITE_SENT: 'system-invite-sent',
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
}

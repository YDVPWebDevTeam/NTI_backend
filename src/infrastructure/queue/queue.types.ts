export const EMAIL_JOBS = {
  PASSWORD_RESET: 'password-reset',
  USER_CONFIRMATION: 'user-confirmation',
  TEAM_CONFIRMATION: 'team-confirmation',
  ORG_PENDING_REVIEW: 'org-pending-review',
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
  [EMAIL_JOBS.ORG_PENDING_REVIEW]: {
    organizationId: string;
  };
}

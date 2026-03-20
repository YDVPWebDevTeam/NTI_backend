export const EMAIL_JOBS = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password-reset',
} as const;

export type EmailJobName = (typeof EMAIL_JOBS)[keyof typeof EMAIL_JOBS];

export interface EmailJobData {
  [EMAIL_JOBS.WELCOME]: { userId: string; email: string };
  [EMAIL_JOBS.PASSWORD_RESET]: { userId: string; email: string; token: string };
}

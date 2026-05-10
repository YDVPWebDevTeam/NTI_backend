import { UserRole } from '../../../generated/prisma/enums';

export const EMAIL_TEMPLATES = {
  PASSWORD_RESET: 'password-reset',
  USER_CONFIRMATION: 'user-confirmation',
  SYSTEM_INVITE: 'system-invite',
  ORG_PENDING_REVIEW: 'org-pending-review',
  ORG_APPROVED: 'org-approved',
  ORG_REJECTED: 'org-rejected',
  ORG_INVITE: 'org-invite',
  TEAM_INVITATION: 'team-invitation',
} as const;

export type EmailTemplateName =
  (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];

export interface EmailTemplateDataByName {
  [EMAIL_TEMPLATES.PASSWORD_RESET]: { token: string };
  [EMAIL_TEMPLATES.USER_CONFIRMATION]: {
    token: string;
    confirmationPath: string;
  };
  [EMAIL_TEMPLATES.SYSTEM_INVITE]: {
    token: string;
    roleToAssign: UserRole;
  };
  [EMAIL_TEMPLATES.TEAM_INVITATION]: {
    teamName: string;
    token: string;
  };
  [EMAIL_TEMPLATES.ORG_PENDING_REVIEW]: {
    organizationId: string;
  };
  [EMAIL_TEMPLATES.ORG_APPROVED]: {
    organizationId: string;
    organizationName: string;
  };
  [EMAIL_TEMPLATES.ORG_REJECTED]: {
    organizationId: string;
    organizationName: string;
    rejectionReason: string;
  };
  [EMAIL_TEMPLATES.ORG_INVITE]: {
    token: string;
    organizationName: string;
  };
}

export interface RenderedEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

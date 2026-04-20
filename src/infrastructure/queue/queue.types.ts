import type { PdfTemplateRenderOptions } from '../pdf/pdf.types';

import { UserRole } from '../../../generated/prisma/enums';

export const EMAIL_JOBS = {
  PASSWORD_RESET: 'password-reset',
  USER_CONFIRMATION: 'user-confirmation',
  TEAM_CONFIRMATION: 'team-confirmation',
  SYSTEM_INVITE_SENT: 'system-invite-sent',
  ORG_PENDING_REVIEW: 'org-pending-review',
  ORG_APPROVED: 'org-approved',
  ORG_REJECTED: 'org-rejected',
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

  [EMAIL_JOBS.ORG_APPROVED]: {
    organizationId: string;
    organizationName: string;
    ownerEmails: string[];
  };

  [EMAIL_JOBS.ORG_REJECTED]: {
    organizationId: string;
    organizationName: string;
    ownerEmails: string[];
    rejectionReason: string;
  };

  [EMAIL_JOBS.ORG_INVITE]: {
    email: string;
    token: string;
    organizationName: string;
  };
}

export const PDF_JOBS = {
  RENDER_TEMPLATE: 'render-template',
} as const;

export const PDF_TEMPLATES = {
  REPORT: 'report',
} as const;

export type PdfJobName = (typeof PDF_JOBS)[keyof typeof PDF_JOBS];
export type PdfTemplateName =
  (typeof PDF_TEMPLATES)[keyof typeof PDF_TEMPLATES];

export interface PdfTemplateDataByName {
  [PDF_TEMPLATES.REPORT]: { html: string };
}

type RenderTemplatePdfJobData = {
  [K in PdfTemplateName]: {
    template: K;
    data: PdfTemplateDataByName[K];
    options?: PdfTemplateRenderOptions;
  };
}[PdfTemplateName];

export interface PdfJobData {
  [PDF_JOBS.RENDER_TEMPLATE]: RenderTemplatePdfJobData;
}

export interface PdfJobResult {
  [PDF_JOBS.RENDER_TEMPLATE]: {
    contentType: 'application/pdf';
    bufferBase64: string;
    fileName: string;
  };
}

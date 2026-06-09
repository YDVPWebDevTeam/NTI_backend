import type { PdfTemplateRenderOptions } from '../pdf/pdf.types';

import { UserRole } from '../../../generated/prisma/enums';
import type { ConfirmationPath } from '../../auth/confirmation-paths';

export const EMAIL_JOBS = {
  PASSWORD_RESET: 'password-reset',
  USER_CONFIRMATION: 'user-confirmation',
  EMAIL_CHANGE_CONFIRMATION: 'email-change-confirmation',
  SYSTEM_INVITE_SENT: 'system-invite-sent',
  ORG_PENDING_REVIEW: 'org-pending-review',
  ORG_APPROVED: 'org-approved',
  ORG_REJECTED: 'org-rejected',
  ORG_INVITE: 'org-invite',
  TEAM_INVITATION: 'team-invitation',
  APPLICATION_SUBMITTED: 'application-submitted',
  APPLICATION_NEEDS_INFO_REQUESTED: 'application-needs-info-requested',
  APPLICATION_APPROVED: 'application-approved',
  APPLICATION_REJECTED: 'application-rejected',
  APPLICATION_MENTOR_ASSIGNED: 'application-mentor-assigned',
  PROGRAM_B_MENTOR_NEEDED: 'program-b-mentor-needed',
  PROGRAM_B_TEAM_ACCEPTED: 'program-b-team-accepted',
  PROGRAM_B_MENTOR_ASSIGNED: 'program-b-mentor-assigned',
} as const;

export type EmailJobName = (typeof EMAIL_JOBS)[keyof typeof EMAIL_JOBS];
export interface EmailJobData {
  [EMAIL_JOBS.PASSWORD_RESET]: { userId: string; email: string; token: string };

  [EMAIL_JOBS.USER_CONFIRMATION]: {
    email: string;
    token: string;
    confirmationPath: ConfirmationPath;
  };

  [EMAIL_JOBS.EMAIL_CHANGE_CONFIRMATION]: {
    email: string;
    token: string;
    newEmail: string;
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

  [EMAIL_JOBS.APPLICATION_SUBMITTED]: {
    email: string;
    applicationId: string;
    applicationTitle: string;
  };

  [EMAIL_JOBS.APPLICATION_NEEDS_INFO_REQUESTED]: {
    email: string;
    applicationId: string;
    applicationTitle: string;
  };

  [EMAIL_JOBS.APPLICATION_APPROVED]: {
    email: string;
    applicationId: string;
    applicationTitle: string;
  };

  [EMAIL_JOBS.APPLICATION_REJECTED]: {
    email: string;
    applicationId: string;
    applicationTitle: string;
    reason: string;
  };

  [EMAIL_JOBS.APPLICATION_MENTOR_ASSIGNED]: {
    email: string;
    applicationId: string;
    applicationTitle: string;
  };

  [EMAIL_JOBS.PROGRAM_B_MENTOR_NEEDED]: {
    projectId: string;
    backlogTitle: string;
    organizationName: string;
    teamName: string;
    adminEmails: string[];
  };

  [EMAIL_JOBS.PROGRAM_B_TEAM_ACCEPTED]: {
    email: string;
    teamName: string;
    backlogTitle: string;
    organizationName: string;
  };

  [EMAIL_JOBS.PROGRAM_B_MENTOR_ASSIGNED]: {
    email: string;
    projectId: string;
    backlogTitle: string;
    teamName: string;
  };
}

export const PDF_JOBS = {
  RENDER_TEMPLATE: 'render-template',
} as const;

export const REPORT_EXPORT_JOBS = {
  GENERATE: 'generate',
} as const;

export const PDF_TEMPLATES = {
  REPORT: 'report',
} as const;

export type PdfJobName = (typeof PDF_JOBS)[keyof typeof PDF_JOBS];
export type ReportExportJobName =
  (typeof REPORT_EXPORT_JOBS)[keyof typeof REPORT_EXPORT_JOBS];
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

export type ReportExportQueuedQuery = {
  dataset: 'applications' | 'program-b';
  format: 'csv' | 'xlsx' | 'pdf';
  dateFrom?: string;
  dateTo?: string;
  programType?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
};

export interface ReportExportJobData {
  [REPORT_EXPORT_JOBS.GENERATE]: {
    exportJobId: string;
    query: ReportExportQueuedQuery;
  };
}

export interface ReportExportJobResult {
  [REPORT_EXPORT_JOBS.GENERATE]: {
    exportJobId: string;
  };
}

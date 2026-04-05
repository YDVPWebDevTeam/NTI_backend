import { PdfTemplateRenderOptions } from '../pdf';
import { DemoPdfTemplateData } from '../pdf/templates/demo-pdf.template';

export const EMAIL_JOBS = {
  PASSWORD_RESET: 'password-reset',
  USER_CONFIRMATION: 'user-confirmation',
  TEAM_CONFIRMATION: 'team-confirmation',
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
}

export const PDF_JOBS = {
  RENDER_TEMPLATE: 'render-template',
} as const;

export const PDF_TEMPLATES = {
  DEMO: 'demo',
} as const;

export type PdfJobName = (typeof PDF_JOBS)[keyof typeof PDF_JOBS];
export type PdfTemplateName =
  (typeof PDF_TEMPLATES)[keyof typeof PDF_TEMPLATES];

export interface PdfTemplateDataByName {
  [PDF_TEMPLATES.DEMO]: DemoPdfTemplateData;
}

export interface PdfJobData {
  [PDF_JOBS.RENDER_TEMPLATE]: {
    template: PdfTemplateName;
    data: PdfTemplateDataByName[PdfTemplateName];
    options?: PdfTemplateRenderOptions;
  };
}

export interface PdfJobResult {
  [PDF_JOBS.RENDER_TEMPLATE]: {
    contentType: 'application/pdf';
    bufferBase64: string;
    fileName: string;
  };
}

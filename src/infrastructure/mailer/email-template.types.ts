import { UserRole } from '../../../generated/prisma/enums';
import type { ConfirmationPath } from '../../auth/confirmation-paths';

export const EMAIL_TEMPLATES = {
  PASSWORD_RESET: 'password-reset',
  USER_CONFIRMATION: 'user-confirmation',
  EMAIL_CHANGE_CONFIRMATION: 'email-change-confirmation',
  SYSTEM_INVITE: 'system-invite',
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
  STUDENT_EMAIL_VERIFICATION: 'student-email-verification',
  UNIVERSITY_DOMAIN_REQUESTED: 'university-domain-requested',
} as const;

export type EmailTemplateName =
  (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];

export interface EmailTemplateDataByName {
  [EMAIL_TEMPLATES.PASSWORD_RESET]: { token: string };
  [EMAIL_TEMPLATES.USER_CONFIRMATION]: {
    token: string;
    confirmationPath: ConfirmationPath;
  };
  [EMAIL_TEMPLATES.EMAIL_CHANGE_CONFIRMATION]: {
    token: string;
    newEmail: string;
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
  [EMAIL_TEMPLATES.APPLICATION_SUBMITTED]: {
    applicationId: string;
    applicationTitle: string;
  };
  [EMAIL_TEMPLATES.APPLICATION_NEEDS_INFO_REQUESTED]: {
    applicationId: string;
    applicationTitle: string;
  };
  [EMAIL_TEMPLATES.APPLICATION_APPROVED]: {
    applicationId: string;
    applicationTitle: string;
  };
  [EMAIL_TEMPLATES.APPLICATION_REJECTED]: {
    applicationId: string;
    applicationTitle: string;
    reason: string;
  };
  [EMAIL_TEMPLATES.APPLICATION_MENTOR_ASSIGNED]: {
    applicationId: string;
    applicationTitle: string;
  };
  [EMAIL_TEMPLATES.PROGRAM_B_MENTOR_NEEDED]: {
    projectId: string;
    backlogTitle: string;
    organizationName: string;
    teamName: string;
  };
  [EMAIL_TEMPLATES.PROGRAM_B_TEAM_ACCEPTED]: {
    teamName: string;
    backlogTitle: string;
    organizationName: string;
  };
  [EMAIL_TEMPLATES.PROGRAM_B_MENTOR_ASSIGNED]: {
    projectId: string;
    backlogTitle: string;
    teamName: string;
  };
  [EMAIL_TEMPLATES.STUDENT_EMAIL_VERIFICATION]: {
    token: string;
  };
  [EMAIL_TEMPLATES.UNIVERSITY_DOMAIN_REQUESTED]: {
    domain: string;
    requestedByEmail: string;
    note?: string;
  };
}

export interface RenderedEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

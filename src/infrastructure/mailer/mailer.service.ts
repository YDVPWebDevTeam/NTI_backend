import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '../config';
import { UserRole } from '../../../generated/prisma/enums';
import type { ConfirmationPath } from '../../auth/confirmation-paths';
import { EmailTemplateRegistryService } from './email-template-registry.service';
import {
  EMAIL_TEMPLATES,
  type EmailTemplateDataByName,
  type EmailTemplateName,
} from './email-template.types';

@Injectable()
export class MailerService {
  private readonly brevoSendEmailUrl = 'https://api.brevo.com/v3/smtp/email';
  private readonly logger = new Logger(MailerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailTemplateRegistryService: EmailTemplateRegistryService,
  ) {}

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    try {
      const response = await fetch(this.brevoSendEmailUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.configService.brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: this.configService.emailFrom },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Brevo API error ${response.status}: ${body}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send email to "${to}" (subject: "${subject}") via brevo: ${message}`,
        stack,
      );

      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendTemplate<K extends EmailTemplateName>(
    to: string,
    template: K,
    data: EmailTemplateDataByName[K],
  ): Promise<void> {
    const rendered = this.emailTemplateRegistryService.render(template, data);
    await this.sendEmail(to, rendered.subject, rendered.html, rendered.text);
  }

  async sendConfirmationEmail(
    email: string,
    token: string,
    confirmationPath: ConfirmationPath,
  ): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.USER_CONFIRMATION, {
      token,
      confirmationPath,
    });
  }

  async sendEmailChangeConfirmationEmail(
    email: string,
    token: string,
    newEmail: string,
  ): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.EMAIL_CHANGE_CONFIRMATION, {
      token,
      newEmail,
    });
  }

  async sendTeamConfirm(
    email: string,
    teamName: string,
    token: string,
  ): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.TEAM_INVITATION, {
      teamName,
      token,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.PASSWORD_RESET, { token });
  }

  async sendSystemInvite(
    email: string,
    token: string,
    roleToAssign: UserRole,
  ): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.SYSTEM_INVITE, {
      token,
      roleToAssign,
    });
  }

  async sendOrgInviteEmail(
    email: string,
    token: string,
    organizationName: string,
  ): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.ORG_INVITE, {
      token,
      organizationName,
    });
  }

  async sendOrgPendingReviewEmail(
    email: string,
    organizationId: string,
  ): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.ORG_PENDING_REVIEW, {
      organizationId,
    });
  }

  async sendOrgApprovedEmail(
    email: string,
    organizationId: string,
    organizationName: string,
  ): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.ORG_APPROVED, {
      organizationId,
      organizationName,
    });
  }

  async sendOrgRejectedEmail(
    email: string,
    organizationId: string,
    organizationName: string,
    rejectionReason: string,
  ): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.ORG_REJECTED, {
      organizationId,
      organizationName,
      rejectionReason,
    });
  }

  async sendApplicationSubmittedEmail(
    email: string,
    applicationId: string,
    applicationTitle: string,
  ): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.APPLICATION_SUBMITTED, {
      applicationId,
      applicationTitle,
    });
  }

  async sendApplicationNeedsInfoEmail(
    email: string,
    applicationId: string,
    applicationTitle: string,
  ): Promise<void> {
    await this.sendTemplate(
      email,
      EMAIL_TEMPLATES.APPLICATION_NEEDS_INFO_REQUESTED,
      {
        applicationId,
        applicationTitle,
      },
    );
  }

  async sendApplicationApprovedEmail(
    email: string,
    applicationId: string,
    applicationTitle: string,
  ): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.APPLICATION_APPROVED, {
      applicationId,
      applicationTitle,
    });
  }

  async sendApplicationRejectedEmail(
    email: string,
    applicationId: string,
    applicationTitle: string,
    reason: string,
  ): Promise<void> {
    await this.sendTemplate(email, EMAIL_TEMPLATES.APPLICATION_REJECTED, {
      applicationId,
      applicationTitle,
      reason,
    });
  }

  async sendApplicationMentorAssignedEmail(
    email: string,
    applicationId: string,
    applicationTitle: string,
  ): Promise<void> {
    await this.sendTemplate(
      email,
      EMAIL_TEMPLATES.APPLICATION_MENTOR_ASSIGNED,
      {
        applicationId,
        applicationTitle,
      },
    );
  }
}

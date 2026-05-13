import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../config';
import { EmailLayoutService } from './email-layout.service';
import {
  EMAIL_TEMPLATES,
  type EmailTemplateDataByName,
  type EmailTemplateName,
  type RenderedEmailTemplate,
} from './email-template.types';

type EmailTemplateRenderer<K extends EmailTemplateName> = {
  render: (data: EmailTemplateDataByName[K]) => RenderedEmailTemplate;
};

type EmailTemplateRegistry = {
  [K in EmailTemplateName]: EmailTemplateRenderer<K>;
};

@Injectable()
export class EmailTemplateRegistryService {
  constructor(
    private readonly configService: ConfigService,
    private readonly emailLayoutService: EmailLayoutService,
  ) {}

  render<K extends EmailTemplateName>(
    template: K,
    data: EmailTemplateDataByName[K],
  ): RenderedEmailTemplate {
    const handler = this.getRegistry()[template] as
      | EmailTemplateRenderer<K>
      | undefined;

    if (!handler) {
      throw new InternalServerErrorException(
        `Unknown email template: ${String(template)}`,
      );
    }

    return handler.render(data);
  }

  private createActionEmail(input: {
    subject: string;
    title: string;
    preheader: string;
    intro: string[];
    cta?: { label: string; url: string };
    outro?: string[];
    note?: string;
  }): RenderedEmailTemplate {
    const body = this.emailLayoutService.render({
      preheader: input.preheader,
      title: input.title,
      intro: input.intro,
      cta: input.cta,
      outro: input.outro,
      note: input.note,
    });

    return {
      subject: input.subject,
      html: body.html,
      text: body.text,
    };
  }

  private getRegistry(): EmailTemplateRegistry {
    return {
      [EMAIL_TEMPLATES.USER_CONFIRMATION]: {
        render: (data) =>
          this.createActionEmail({
            title: 'Confirm your email',
            preheader:
              'Confirm your email address to finish setting up your NTI account.',
            intro: [
              'Your account has been created successfully.',
              'Confirm your email address to activate your NTI access and continue with onboarding.',
            ],
            cta: {
              label: 'Confirm email',
              url: `${this.configService.frontUrl}${data.confirmationPath}?token=${encodeURIComponent(data.token)}`,
            },
            note: 'This confirmation link is single-use and should only be used by the account owner.',
            subject: 'Email confirmation',
          }),
      },
      [EMAIL_TEMPLATES.PASSWORD_RESET]: {
        render: (data) =>
          this.createActionEmail({
            title: 'Reset your password',
            preheader:
              'Use the secure link to set a new password for your NTI account.',
            intro: [
              'We received a request to reset the password for your NTI account.',
              'If you made this request, use the secure link below to choose a new password.',
            ],
            cta: {
              label: 'Reset password',
              url: `${this.configService.frontUrl}/reset-password?token=${encodeURIComponent(data.token)}`,
            },
            note: 'If you did not request this reset, you can ignore this email and your password will remain unchanged.',
            subject: 'Password reset',
          }),
      },
      [EMAIL_TEMPLATES.TEAM_INVITATION]: {
        render: (data) =>
          this.createActionEmail({
            title: 'You were invited to a team',
            preheader: 'Accept your NTI team invitation to join the workspace.',
            intro: [
              `You have been invited to join the team ${data.teamName}.`,
              'Open the invitation to review it and complete the sign-up or sign-in flow.',
            ],
            cta: {
              label: 'Accept invitation',
              url: `${this.configService.frontUrl}/invite?token=${encodeURIComponent(data.token)}`,
            },
            subject: 'Team invitation',
          }),
      },
      [EMAIL_TEMPLATES.SYSTEM_INVITE]: {
        render: (data) =>
          this.createActionEmail({
            title: 'System invitation',
            preheader: 'Your NTI account invitation is ready for activation.',
            intro: [
              `You have been invited to NTI with the role ${data.roleToAssign}.`,
              'Use the invitation below to activate your access securely.',
            ],
            cta: {
              label: 'Accept invitation',
              url: `${this.configService.frontUrl}/invite?token=${encodeURIComponent(data.token)}`,
            },
            subject: 'System invitation',
          }),
      },
      [EMAIL_TEMPLATES.ORG_INVITE]: {
        render: (data) =>
          this.createActionEmail({
            title: 'Organization invitation',
            preheader: 'You were invited to join an organization in NTI.',
            intro: [
              `You have been invited to join ${data.organizationName}.`,
              'Open the invitation to continue with the acceptance flow.',
            ],
            cta: {
              label: 'Accept invitation',
              url: `${this.configService.frontUrl}/invite?token=${encodeURIComponent(data.token)}`,
            },
            subject: 'Organization invitation',
          }),
      },
      [EMAIL_TEMPLATES.ORG_PENDING_REVIEW]: {
        render: (data) =>
          this.createActionEmail({
            title: 'Organization pending review',
            preheader: 'A new organization requires admin review in NTI.',
            intro: [
              'A new organization has been created and is waiting for administrative review.',
              'Open the admin detail page to validate the submission and continue the workflow.',
            ],
            cta: {
              label: 'Review organization',
              url: `${this.configService.frontUrl}/admin/organizations/${data.organizationId}`,
            },
            subject: 'Organization pending review',
          }),
      },
      [EMAIL_TEMPLATES.ORG_APPROVED]: {
        render: (data) =>
          this.createActionEmail({
            title: 'Organization approved',
            preheader: 'Your organization has been approved in NTI.',
            intro: [
              `Your organization ${data.organizationName} has been approved.`,
              'Open the organization workspace to continue with setup and collaboration.',
            ],
            cta: {
              label: 'Open organization',
              url: `${this.configService.frontUrl}/organization/${data.organizationId}`,
            },
            subject: 'Organization approved',
          }),
      },
      [EMAIL_TEMPLATES.ORG_REJECTED]: {
        render: (data) =>
          this.createActionEmail({
            title: 'Organization rejected',
            preheader:
              'Your organization submission was reviewed and needs changes.',
            intro: [
              `Your organization ${data.organizationName} was reviewed but could not be approved yet.`,
              'Open the organization detail and review the rejection reason below.',
            ],
            cta: {
              label: 'Open organization',
              url: `${this.configService.frontUrl}/organization/${data.organizationId}`,
            },
            note: `Reason: ${data.rejectionReason}`,
            subject: 'Organization rejected',
          }),
      },
    };
  }
}

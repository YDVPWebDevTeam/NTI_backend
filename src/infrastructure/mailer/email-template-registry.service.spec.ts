import { UserRole } from '../../../generated/prisma/enums';
import { ConfigService } from '../config';
import { EmailLayoutService } from './email-layout.service';
import { EmailTemplateRegistryService } from './email-template-registry.service';
import { EMAIL_TEMPLATES } from './email-template.types';

describe('EmailTemplateRegistryService', () => {
  const configService = {
    frontUrl: 'https://app.nti.test',
    emailLogoUrl: undefined,
  } as ConfigService;

  let service: EmailTemplateRegistryService;

  beforeEach(() => {
    service = new EmailTemplateRegistryService(
      configService,
      new EmailLayoutService(configService),
    );
  });

  it('renders user confirmation with shared layout and text fallback', () => {
    const result = service.render(EMAIL_TEMPLATES.USER_CONFIRMATION, {
      token: 'confirm-token',
      confirmationPath: '/register/student',
    });

    expect(result.subject).toBe('Email confirmation');
    expect(result.html).toContain('Confirm your email');
    expect(result.html).toContain(
      'https://app.nti.test/register/student?token=confirm-token',
    );
    expect(result.html).toContain('NTI automated email');
    expect(result.text).toContain(
      'Confirm email: https://app.nti.test/register/student?token=confirm-token',
    );
  });

  it('renders email change confirmation with the new email in the content', () => {
    const result = service.render(EMAIL_TEMPLATES.EMAIL_CHANGE_CONFIRMATION, {
      token: 'email-change-token',
      newEmail: 'new@example.com',
    });

    expect(result.subject).toBe('Confirm email change');
    expect(result.html).toContain('new@example.com');
    expect(result.html).toContain(
      'https://app.nti.test/account/change-email/confirm?token=email-change-token',
    );
    expect(result.text).toContain(
      'Confirm new email: https://app.nti.test/account/change-email/confirm?token=email-change-token',
    );
  });

  it('escapes dynamic content in organization rejection emails', () => {
    const result = service.render(EMAIL_TEMPLATES.ORG_REJECTED, {
      organizationId: 'org-1',
      organizationName: '<Acme & Co>',
      rejectionReason: 'Missing <script>alert(1)</script> & docs',
    });

    expect(result.subject).toBe('Organization rejected');
    expect(result.html).toContain('&lt;Acme &amp; Co&gt;');
    expect(result.html).toContain(
      'Reason: Missing &lt;script&gt;alert(1)&lt;/script&gt; &amp; docs',
    );
    expect(result.html).not.toContain('<script>alert(1)</script>');
    expect(result.text).toContain(
      'Reason: Missing <script>alert(1)</script> & docs',
    );
  });

  it('renders logo image when EMAIL_LOGO_URL is configured', () => {
    const logoConfig = {
      ...configService,
      emailLogoUrl: 'https://cdn.nti.test/icons/nti-logo.svg',
    } as ConfigService;
    const logoService = new EmailTemplateRegistryService(
      logoConfig,
      new EmailLayoutService(logoConfig),
    );

    const result = logoService.render(EMAIL_TEMPLATES.SYSTEM_INVITE, {
      token: 'invite-token',
      roleToAssign: UserRole.ADMIN,
    });

    expect(result.html).toContain('https://cdn.nti.test/icons/nti-logo.svg');
    expect(result.html).toContain('alt="NTI"');
  });

  it('renders all current email templates with the expected subjects', () => {
    expect(
      service.render(EMAIL_TEMPLATES.PASSWORD_RESET, { token: 'reset-token' })
        .subject,
    ).toBe('Password reset');
    expect(
      service.render(EMAIL_TEMPLATES.EMAIL_CHANGE_CONFIRMATION, {
        token: 'email-change-token',
        newEmail: 'new@example.com',
      }).subject,
    ).toBe('Confirm email change');
    expect(
      service.render(EMAIL_TEMPLATES.TEAM_INVITATION, {
        teamName: 'Alpha Team',
        token: 'team-token',
      }).subject,
    ).toBe('Team invitation');
    expect(
      service.render(EMAIL_TEMPLATES.SYSTEM_INVITE, {
        token: 'system-token',
        roleToAssign: UserRole.ADMIN,
      }).subject,
    ).toBe('System invitation');
    expect(
      service.render(EMAIL_TEMPLATES.ORG_PENDING_REVIEW, {
        organizationId: 'org-1',
      }).subject,
    ).toBe('Organization pending review');
    expect(
      service.render(EMAIL_TEMPLATES.ORG_APPROVED, {
        organizationId: 'org-1',
        organizationName: 'Acme Labs',
      }).subject,
    ).toBe('Organization approved');
    expect(
      service.render(EMAIL_TEMPLATES.ORG_INVITE, {
        token: 'org-token',
        organizationName: 'Acme Labs',
      }).subject,
    ).toBe('Organization invitation');
  });
});

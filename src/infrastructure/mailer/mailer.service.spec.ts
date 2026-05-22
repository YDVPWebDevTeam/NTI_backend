import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../config';
import { EmailTemplateRegistryService } from './email-template-registry.service';
import { MailerService } from './mailer.service';

describe('MailerService', () => {
  const configService = {
    brevoApiKey: 'brevo-api-key',
    emailFrom: 'noreply@example.com',
  } as ConfigService;
  const emailTemplateRegistryService = {
    render: jest.fn(),
  } as unknown as EmailTemplateRegistryService;

  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('sends email through Brevo transactional API', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
    });
    global.fetch = fetchMock;

    const service = new MailerService(
      configService,
      emailTemplateRegistryService,
    );

    await service.sendEmail(
      'user@example.com',
      'Subject',
      '<p>Hello</p>',
      'Hello',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': 'brevo-api-key',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: 'noreply@example.com' },
          to: [{ email: 'user@example.com' }],
          subject: 'Subject',
          htmlContent: '<p>Hello</p>',
          textContent: 'Hello',
        }),
      },
    );
  });

  it('wraps Brevo API failures', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('invalid api key'),
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const service = new MailerService(
      configService,
      emailTemplateRegistryService,
    );

    await expect(
      service.sendEmail('user@example.com', 'Subject', '<p>Hello</p>'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('renders the email change confirmation template before sending', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
    });
    global.fetch = fetchMock;
    const renderMock = jest
      .fn()
      .mockReturnValue({ subject: 'Confirm email change', html: '<p>x</p>' });
    const service = new MailerService(configService, {
      render: renderMock,
    } as unknown as EmailTemplateRegistryService);

    await service.sendEmailChangeConfirmationEmail(
      'new@example.com',
      'email-change-token',
      'new@example.com',
    );

    expect(renderMock).toHaveBeenCalledWith('email-change-confirmation', {
      token: 'email-change-token',
      newEmail: 'new@example.com',
    });
    expect(fetchMock).toHaveBeenCalled();
  });
});

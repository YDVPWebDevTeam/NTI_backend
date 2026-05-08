import { ConfigService } from './config.service';

const BASE_ENV = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/nti_db',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_USER: 'smtp-user',
  SMTP_PASSWORD: 'smtp-password',
  SMTP_FROM: 'noreply@example.com',
  FRONTEND_URL: 'http://localhost:3000',
  JWT_ACCESS_SECRET: '12345678901234567890123456789012',
  JWT_REFRESH_SECRET: '12345678901234567890123456789012',
  JWT_FORCE_PASSWORD_CHANGE_SECRET: '12345678901234567890123456789012',
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION_DAYS: '7d',
};

describe('ConfigService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...BASE_ENV };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows origins matched by wildcard entries', () => {
    process.env.CORS_ORIGINS =
      'http://localhost:3000,https://nti-*-klymenvladgmailcoms-projects.vercel.app';

    const configService = new ConfigService();

    expect(
      configService.isCorsOriginAllowed(
        'https://nti-8gwd9cff8-klymenvladgmailcoms-projects.vercel.app',
      ),
    ).toBe(true);
    expect(
      configService.isCorsOriginAllowed(
        'https://nti-hbmf1w9e3-klymenvladgmailcoms-projects.vercel.app',
      ),
    ).toBe(true);
    expect(configService.isCorsOriginAllowed('https://evil.vercel.app')).toBe(
      false,
    );
  });

  it('allows requests without origin header', () => {
    process.env.CORS_ORIGINS = 'http://localhost:3000';

    const configService = new ConfigService();

    expect(configService.isCorsOriginAllowed(undefined)).toBe(true);
  });
});

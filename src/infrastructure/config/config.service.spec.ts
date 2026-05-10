import { ConfigService } from './config.service';

const BASE_ENV = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/nti_db',
  BREVO_API_KEY: 'brevo-api-key',
  EMAIL_FROM: 'noreply@example.com',
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

  it('allows the local backend origin for same-origin Swagger requests', () => {
    process.env.CORS_ORIGINS = 'http://localhost:3000';
    process.env.PORT = '3001';
    process.env.APP_ENV = 'local';

    const configService = new ConfigService();

    expect(configService.isCorsOriginAllowed('http://localhost:3001')).toBe(
      true,
    );
    expect(configService.isCorsOriginAllowed('http://127.0.0.1:3001')).toBe(
      true,
    );
  });

  it('exposes optional email logo url when configured', () => {
    process.env.EMAIL_LOGO_URL = 'https://cdn.example.com/icons/nti-logo.svg';

    const configService = new ConfigService();

    expect(configService.emailLogoUrl).toBe(
      'https://cdn.example.com/icons/nti-logo.svg',
    );
  });
});

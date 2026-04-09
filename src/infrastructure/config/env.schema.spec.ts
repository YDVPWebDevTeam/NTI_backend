import { envSchema } from './env.schema';

describe('envSchema', () => {
  it('parses Puppeteer defaults', () => {
    const parsed = envSchema.parse({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/nti_db',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 587,
      SMTP_USER: 'smtp-user',
      SMTP_PASSWORD: 'smtp-password',
      SMTP_FROM: 'noreply@example.com',
      FRONTEND_URL: 'http://localhost:3000',
      R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
      R2_BUCKET_NAME: 'nti-bucket',
      R2_ACCESS_KEY_ID: 'access-key-id',
      R2_SECRET_ACCESS_KEY: 'secret-access-key',
      JWT_ACCESS_SECRET: '12345678901234567890123456789012',
      JWT_REFRESH_SECRET: '12345678901234567890123456789012',
      JWT_FORCE_PASSWORD_CHANGE_SECRET: '12345678901234567890123456789012',
      JWT_ACCESS_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION_DAYS: '7d',
    });

    expect(parsed.PUPPETEER_HEADLESS).toBe(true);
    expect(parsed.PUPPETEER_TIMEOUT_MS).toBe(30000);
    expect(parsed.PDF_JOB_WAIT_TIMEOUT_MS).toBe(60000);
    expect(parsed.PDF_WORKER_CONCURRENCY).toBe(2);
    expect(parsed.PUPPETEER_EXECUTABLE_PATH).toBeUndefined();
  });
});

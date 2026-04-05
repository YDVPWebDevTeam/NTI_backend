import { Injectable } from '@nestjs/common';
import { envSchema, type Env } from './env.schema.js';
import type { StringValue } from 'ms';

@Injectable()
export class ConfigService {
  private readonly env: Env;

  constructor() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      const formatted = result.error.issues
        .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid environment variables:\n${formatted}`);
    }

    this.env = result.data;
  }

  get port(): number {
    return this.env.PORT;
  }

  get smtpHost(): string {
    return this.env.SMTP_HOST;
  }

  get smtpPort(): number {
    return this.env.SMTP_PORT;
  }
  get smtpUser(): string {
    return this.env.SMTP_USER;
  }
  get smtpPassword(): string {
    return this.env.SMTP_PASSWORD;
  }
  get smtpFrom(): string {
    return this.env.SMTP_FROM;
  }
  get frontUrl(): string {
    return this.env.FRONTEND_URL;
  }

  get puppeteerExecutablePath(): string | undefined {
    return this.env.PUPPETEER_EXECUTABLE_PATH;
  }

  get puppeteerHeadless(): boolean {
    return this.env.PUPPETEER_HEADLESS;
  }

  get puppeteerTimeoutMs(): number {
    return this.env.PUPPETEER_TIMEOUT_MS;
  }

  get pdfJobWaitTimeoutMs(): number {
    return this.env.PDF_JOB_WAIT_TIMEOUT_MS;
  }

  get pdfWorkerConcurrency(): number {
    return this.env.PDF_WORKER_CONCURRENCY;
  }

  get nodeEnv(): string {
    return this.env.NODE_ENV;
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  get corsOrigins(): string[] {
    return this.env.CORS_ORIGINS.split(',').map((o) => o.trim());
  }

  get logLevel(): string {
    return this.env.LOG_LEVEL;
  }

  get redisHost(): string {
    return this.env.REDIS_HOST;
  }

  get redisPort(): number {
    return this.env.REDIS_PORT;
  }

  get jwtAccessSecret(): string {
    return this.env.JWT_ACCESS_SECRET;
  }

  get jwtRefreshSecret(): string {
    return this.env.JWT_REFRESH_SECRET;
  }

  get jwtAccessExpiration(): StringValue {
    return this.env.JWT_ACCESS_EXPIRATION as StringValue;
  }

  get jwtRefreshExpirationDays(): StringValue {
    return this.env.JWT_REFRESH_EXPIRATION_DAYS as StringValue;
  }

  get argon2TimeCost(): number {
    return this.env.ARGON2_TIME_COST;
  }

  get tokenByteLength(): number {
    return this.env.TOKEN_BYTE_LENGTH;
  }

  get emailVerificationExpirationHours(): number {
    return this.env.EMAIL_VERIFICATION_EXPIRATION_HOURS;
  }

  get passwordResetExpirationMinutes(): number {
    return this.env.PASSWORD_RESET_EXPIRATION_MINUTES;
  }
}

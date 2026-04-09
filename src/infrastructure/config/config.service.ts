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

  get r2Endpoint(): string {
    return this.env.R2_ENDPOINT;
  }

  get r2BucketName(): string {
    return this.env.R2_BUCKET_NAME;
  }

  get r2AccessKeyId(): string {
    return this.env.R2_ACCESS_KEY_ID;
  }

  get r2SecretAccessKey(): string {
    return this.env.R2_SECRET_ACCESS_KEY;
  }

  get r2Region(): string {
    return this.env.R2_REGION;
  }

  get r2PublicBaseUrl(): string | undefined {
    return this.env.R2_PUBLIC_BASE_URL;
  }

  get fileUploadPresignExpiresSeconds(): number {
    return this.env.FILE_UPLOAD_PRESIGN_EXPIRES_SECONDS;
  }

  get fileDownloadPresignExpiresSeconds(): number {
    return this.env.FILE_DOWNLOAD_PRESIGN_EXPIRES_SECONDS;
  }

  get fileUploadMaxSizeBytes(): number {
    return this.env.FILE_UPLOAD_MAX_SIZE_BYTES;
  }

  get fileUploadAllowedMimeTypes(): string[] {
    return this.env.FILE_UPLOAD_ALLOWED_MIME_TYPES.split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  get fileUploadVerifyObjectOnComplete(): boolean {
    return this.env.FILE_UPLOAD_VERIFY_OBJECT_ON_COMPLETE;
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

  get jwtForcePasswordChangeSecret(): string {
    return this.env.JWT_FORCE_PASSWORD_CHANGE_SECRET;
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

  get forcePasswordChangeTokenExpirationMinutes(): number {
    return this.env.FORCE_PASSWORD_CHANGE_TOKEN_EXPIRATION_MINUTES;
  }

  get passwordResetExpirationMinutes(): number {
    return this.env.PASSWORD_RESET_EXPIRATION_MINUTES;
  }
}

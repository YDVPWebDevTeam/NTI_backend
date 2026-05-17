import { Injectable } from '@nestjs/common';
import { envSchema, type Env } from './env.schema';
import type { StringValue } from 'ms';

@Injectable()
export class ConfigService {
  private readonly env: Env;
  private readonly parsedCorsOrigins: string[];

  constructor() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      const formatted = result.error.issues
        .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid environment variables:\n${formatted}`);
    }

    this.env = result.data;
    this.parsedCorsOrigins = this.env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get port(): number {
    return this.env.PORT;
  }

  get brevoApiKey(): string {
    return this.env.BREVO_API_KEY;
  }

  get emailFrom(): string {
    return this.env.EMAIL_FROM;
  }

  get emailLogoUrl(): string | undefined {
    return this.env.EMAIL_LOGO_URL;
  }

  get frontUrl(): string {
    return this.env.FRONTEND_URL;
  }

  get r2Endpoint(): string | undefined {
    return this.env.R2_ENDPOINT;
  }

  get r2BucketName(): string | undefined {
    return this.env.R2_BUCKET_NAME;
  }

  get r2AccessKeyId(): string | undefined {
    return this.env.R2_ACCESS_KEY_ID;
  }

  get r2SecretAccessKey(): string | undefined {
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

  get organizationDocumentMaxSizeBytes(): number {
    return this.env.ORGANIZATION_DOCUMENT_MAX_SIZE_BYTES;
  }

  get organizationDocumentAllowedMimeTypes(): string[] {
    return this.env.ORGANIZATION_DOCUMENT_ALLOWED_MIME_TYPES.split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  get organizationDocumentVerifyObjectOnComplete(): boolean {
    return this.env.ORGANIZATION_DOCUMENT_VERIFY_OBJECT_ON_COMPLETE;
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

  get appEnv(): 'local' | 'development' | 'staging' | 'production' | 'test' {
    if (this.env.APP_ENV) {
      return this.env.APP_ENV;
    }

    if (this.env.NODE_ENV === 'test') {
      return 'test';
    }

    return 'local';
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

  get authCookieSameSite(): 'lax' | 'none' {
    return this.appEnv === 'local' || this.appEnv === 'test' ? 'lax' : 'none';
  }

  get authCookieSecure(): boolean {
    return this.appEnv !== 'local' && this.appEnv !== 'test';
  }

  get corsOrigins(): string[] {
    return [...this.parsedCorsOrigins];
  }

  isCorsOriginAllowed(origin: string | undefined): boolean {
    if (!origin) {
      return true;
    }

    if (
      (this.appEnv === 'local' || this.appEnv === 'test') &&
      this.getLocalAppOrigins().includes(origin)
    ) {
      return true;
    }

    return this.parsedCorsOrigins.some((allowedOrigin) =>
      this.matchesCorsOrigin(origin, allowedOrigin),
    );
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

  get devEmailVerificationBypassEnabled(): boolean {
    return this.env.DEV_EMAIL_VERIFICATION_BYPASS_ENABLED;
  }

  get devEmailVerificationBypassToken(): string | undefined {
    return this.env.DEV_EMAIL_VERIFICATION_BYPASS_TOKEN;
  }

  get systemInvitationExpirationHours(): number {
    return this.env.SYSTEM_INVITATION_EXPIRATION_HOURS;
  }

  get organizationInvitationExpirationDays(): number {
    return this.env.ORGANIZATION_INVITATION_EXPIRATION_DAYS;
  }

  get forcePasswordChangeTokenExpirationMinutes(): number {
    return this.env.FORCE_PASSWORD_CHANGE_TOKEN_EXPIRATION_MINUTES;
  }

  get passwordResetExpirationMinutes(): number {
    return this.env.PASSWORD_RESET_EXPIRATION_MINUTES;
  }

  private matchesCorsOrigin(origin: string, allowedOrigin: string): boolean {
    if (allowedOrigin === origin) {
      return true;
    }

    if (!allowedOrigin.includes('*')) {
      return false;
    }

    return this.wildcardToRegExp(allowedOrigin).test(origin);
  }

  private wildcardToRegExp(pattern: string): RegExp {
    const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escapedPattern.replaceAll('*', '.*')}$`);
  }

  private getLocalAppOrigins(): string[] {
    return [`http://localhost:${this.port}`, `http://127.0.0.1:${this.port}`];
  }
}

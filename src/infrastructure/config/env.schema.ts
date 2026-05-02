import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_ENV: z
    .enum(['local', 'development', 'staging', 'production', 'test'])
    .optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASSWORD: z.string().min(1, 'SMTP_PASSWORD is required'),
  SMTP_FROM: z.string().min(1, 'SMTP_FROM is required'),
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),
  R2_ENDPOINT: z.string().url('R2_ENDPOINT must be a valid URL'),
  R2_BUCKET_NAME: z.string().min(1, 'R2_BUCKET_NAME is required'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
  R2_REGION: z.string().default('auto'),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  FILE_UPLOAD_PRESIGN_EXPIRES_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .max(3600)
    .default(900),
  FILE_DOWNLOAD_PRESIGN_EXPIRES_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .max(3600)
    .default(300),
  FILE_UPLOAD_MAX_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  FILE_UPLOAD_ALLOWED_MIME_TYPES: z
    .string()
    .default('image/jpeg,image/png,image/webp,application/pdf'),
  FILE_UPLOAD_VERIFY_OBJECT_ON_COMPLETE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  PUPPETEER_EXECUTABLE_PATH: z.string().min(1).optional(),
  PUPPETEER_HEADLESS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  PUPPETEER_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  PDF_JOB_WAIT_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  PDF_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
  JWT_FORCE_PASSWORD_CHANGE_SECRET: z
    .string()
    .min(
      32,
      'JWT_FORCE_PASSWORD_CHANGE_SECRET must be at least 32 characters long',
    ),
  JWT_ACCESS_EXPIRATION: z
    .string()
    .regex(
      /^\d+[smhd]$/,
      'JWT_ACCESS_EXPIRATION must be a valid duration (e.g., 15m, 1h)',
    ),
  JWT_REFRESH_EXPIRATION_DAYS: z
    .string()
    .regex(
      /^\d+d$/,
      'JWT_REFRESH_EXPIRATION_DAYS must be a valid duration (e.g., 7d)',
    ),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(3),
  TOKEN_BYTE_LENGTH: z.coerce.number().int().positive().default(32),
  EMAIL_VERIFICATION_EXPIRATION_HOURS: z.coerce
    .number()
    .int()
    .positive()
    .default(24),
  DEV_EMAIL_VERIFICATION_BYPASS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DEV_EMAIL_VERIFICATION_BYPASS_TOKEN: z.string().min(1).optional(),
  FORCE_PASSWORD_CHANGE_TOKEN_EXPIRATION_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(15),
  SYSTEM_INVITATION_EXPIRATION_HOURS: z.coerce
    .number()
    .int()
    .positive()
    .default(72),
  ORGANIZATION_INVITATION_EXPIRATION_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .default(7),
  PASSWORD_RESET_EXPIRATION_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(30),
});

export type Env = z.infer<typeof envSchema>;

import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
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
  FORCE_PASSWORD_CHANGE_TOKEN_EXPIRATION_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(15),
});

export type Env = z.infer<typeof envSchema>;

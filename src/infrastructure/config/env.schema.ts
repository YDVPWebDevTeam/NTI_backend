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
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string(),
  SMTP_PASSWORD: z.string(),
  SMTP_FROM: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRATION: z
    .string()
    .regex(
      /^\d+[smhd]$/,
      'JWT_ACCESS_EXPIRATION must be a valid duration (e.g., 15m, 1h)',
    ),
  JWT_REFRESH_EXPIRATION: z
    .string()
    .regex(
      /^\d+[smhd]$/,
      'JWT_REFRESH_EXPIRATION must be a valid duration (e.g., 7d, 1h)',
    ),
  HASH_ROUNDS: z.coerce.number().int().positive().default(10),
});

export type Env = z.infer<typeof envSchema>;

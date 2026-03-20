import { Injectable } from '@nestjs/common';
import { envSchema, type Env } from './env.schema.js';

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
}

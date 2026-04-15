import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ConfigService } from './infrastructure/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.flushLogs();

  const configService = app.get(ConfigService);

  await app.register((await import('@fastify/helmet')).default, {
    global: true,
  });
  await app.register((await import('@fastify/cookie')).default);

  // CORS — origins from env (comma-separated)
  app.enableCors({
    origin: configService.corsOrigins,
    credentials: true,
  });

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes, filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NTI Backend')
    .setDescription(
      'API for NTI platform workflows, authentication, and administrative operations.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Optional fallback: use the access token as Bearer token. Primary transport is HttpOnly cookie.',
      },
      'access-token',
    )
    .addCookieAuth(
      'accessToken',
      {
        type: 'apiKey',
        in: 'cookie',
        description:
          'HttpOnly access token cookie used for authenticated endpoints.',
      },
      'access-token-cookie',
    )
    .addCookieAuth(
      'refreshToken',
      {
        type: 'apiKey',
        in: 'cookie',
        description:
          'HttpOnly refresh token cookie used by the refresh and logout endpoints.',
      },
      'refresh-token',
    )
    .addCookieAuth(
      'requiresPasswordChangeToken',
      {
        type: 'apiKey',
        in: 'cookie',
        description:
          'Short-lived HttpOnly cookie used only for forced password change flow.',
      },
      'password-change-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.port, '0.0.0.0');
}

void bootstrap();

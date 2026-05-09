import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { AppModule } from './app.module';
import { ConfigService } from './infrastructure/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { buildRequestOrigin, isSameOrigin } from './common/http/cors.utils';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.flushLogs();

  const configService = app.get(ConfigService);

  await app.register(helmet, {
    global: true,
  });
  await app.register(cookie);

  await app.register(cors, {
    delegator: (req, callback) => {
      const requestOrigin = buildRequestOrigin(req.headers);

      callback(null, {
        origin: (origin, originCallback) => {
          if (
            isSameOrigin(origin, requestOrigin) ||
            configService.isCorsOriginAllowed(origin)
          ) {
            originCallback(null, true);
            return;
          }

          originCallback(
            new Error(`Origin ${origin ?? 'unknown'} is not allowed by CORS`),
            false,
          );
        },
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      });
    },
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

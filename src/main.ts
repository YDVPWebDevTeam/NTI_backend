import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { ConfigService } from './infrastructure/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

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
    .setDescription('NTI Backend API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.port, '0.0.0.0');
}

void bootstrap();

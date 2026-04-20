import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.flushLogs();
  app.enableShutdownHooks();
}

void bootstrap();

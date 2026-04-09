import { Module } from '@nestjs/common';
import { ConfigModule } from './infrastructure/config';
import { DatabaseModule } from './infrastructure/database';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { MailerModule } from './infrastructure/mailer/mailer.module';
import { PdfCoreModule } from './infrastructure/pdf';
import { QueueModule } from './infrastructure/queue';
import { EmailProcessor } from './infrastructure/queue/processors/email.processor';
import { PdfProcessor } from './infrastructure/queue/processors/pdf.processor';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    LoggerModule,
    QueueModule,
    MailerModule,
    PdfCoreModule,
  ],
  providers: [EmailProcessor, PdfProcessor],
})
export class WorkerModule {}

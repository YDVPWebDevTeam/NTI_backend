import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { ConfigModule, ConfigService } from './infrastructure/config';
import { DatabaseModule } from './infrastructure/database';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { MailerModule } from './infrastructure/mailer/mailer.module';
import { PdfModule } from './infrastructure/pdf';
import { QueueModule } from './infrastructure/queue';
import { EmailProcessor } from './infrastructure/queue/processors/email.processor';
import { PdfProcessor } from './infrastructure/queue/processors/pdf.processor';
import { StorageModule } from './infrastructure/storage';
import { TeamModule } from './team/team.module';
import { UserModule } from './user/user.module';
import { FilesModule } from './files';
import { OrganizationModule } from './organization/organization.module';
import { ProgramBBacklogModule } from './programs/program-b/backlog/program-b-backlog.module';
import { ProgramBProjectsModule } from './programs/program-b/projects/program-b-projects.module';
import { ProgramBTeamApplicationModule } from './programs/program-b/team-application/program-b-team-application.module';
import { StudentProfileModule } from './student-profile';
import { ApplicationsModule } from './applications';
import { AccountModule } from './account/account.module';
import { ProgramBCompanyOverviewModule } from './programs/program-b/company-overview';
import { ReportExportProcessor } from './reports/report-export/report-export.processor';
import { ReportsModule } from './reports/reports.module';
import { ContactModule } from './contact/contact.module';
import { ConversationsModule } from './conversations/conversations.module';

const queueProcessorProviders =
  process.env.RUN_QUEUE_PROCESSORS === 'true'
    ? [EmailProcessor, PdfProcessor, ReportExportProcessor]
    : [];

@Module({
  imports: [
    AdminModule,
    AuthModule,
    ConfigModule,
    DatabaseModule,
    LoggerModule,
    QueueModule,
    TeamModule,
    MailerModule,
    PdfModule,
    StorageModule,
    OrganizationModule,
    ProgramBBacklogModule,
    ProgramBProjectsModule,
    ProgramBTeamApplicationModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        config.isProduction
          ? { ttl: 60_000, limit: 600 }
          : { ttl: 60_000, limit: 30000 },
      ],
    }),
    UserModule,
    FilesModule,
    StudentProfileModule,
    ApplicationsModule,
    AccountModule,
    ProgramBCompanyOverviewModule,
    ReportsModule,
    ContactModule,
    ConversationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    ...queueProcessorProviders,
  ],
})
export class AppModule {}

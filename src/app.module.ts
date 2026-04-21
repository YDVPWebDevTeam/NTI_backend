import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { ConfigModule, ConfigService } from './infrastructure/config';
import { DatabaseModule } from './infrastructure/database';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { MailerModule } from './infrastructure/mailer/mailer.module';
import { PdfModule } from './infrastructure/pdf';
import { QueueModule } from './infrastructure/queue';
import { StorageModule } from './infrastructure/storage';
import { TeamModule } from './team/team.module';
import { UserModule } from './user/user.module';
import { FilesModule } from './files';
import { OrganizationModule } from './organization/organization.module';
import { StudentProfileModule } from './student-profile';
import { ApplicationsModule } from './applications';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from './infrastructure/config';
import { DatabaseModule } from './infrastructure/database';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { MailerModule } from './infrastructure/mailer/mailer.module';
import { QueueModule } from './infrastructure/queue';
import { TeamModule } from './team/team.module';
import { UserModule } from './user/user.module';
import { OrganizationModule } from './organization/organization.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    DatabaseModule,
    LoggerModule,
    QueueModule,
    TeamModule,
    MailerModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

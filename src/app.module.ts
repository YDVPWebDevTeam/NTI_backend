import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from './infrastructure/config';
import { DatabaseModule } from './infrastructure/database';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { MailerModule } from './infrastructure/mailer/mailer.module';
import { QueueModule } from './infrastructure/queue';
import { UserModule } from './user/user.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    DatabaseModule,
    LoggerModule,
    QueueModule,
    MailerModule,
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
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

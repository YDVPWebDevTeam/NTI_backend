import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from './infrastructure/config';
import { DatabaseModule } from './infrastructure/database';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { QueueModule } from './infrastructure/queue';
import { MailerModule } from './infrastructure/mailer/mailer.module';

@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

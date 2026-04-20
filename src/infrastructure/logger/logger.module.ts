import { Module, RequestMethod } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '../config';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.logLevel,
          transport: config.isDevelopment
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:HH:MM:ss',
                  ignore: 'pid,hostname',
                  messageFormat: '[{context}] {msg}',
                },
              }
            : undefined,
          customProps: (req: { headers: Record<string, unknown> }) => ({
            correlationId: req.headers['x-correlation-id'] as
              | string
              | undefined,
          }),
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
        forRoutes: [{ path: '/{*path}', method: RequestMethod.ALL }],
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}

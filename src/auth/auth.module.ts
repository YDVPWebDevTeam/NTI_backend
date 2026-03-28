import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from 'src/infrastructure/config';
import { HashingModule } from '../infrastructure/hashing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { RefreshTokenRepository } from './refresh-token/refresh-token.repository';
import { RefreshTokenService } from './refresh-token/refresh-token.service';
import { JwtAuthStrategy } from './strategies/jwt-auth.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshJwtStrategy } from './strategies/refresh-auth.strategy';
import { RefreshJwtGuard } from './guards/refresh-auth.guard';

@Module({
  imports: [
    UserModule,
    HashingModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.jwtAccessSecret,
        signOptions: {
          expiresIn: config.jwtAccessExpiration,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenRepository,
    RefreshTokenService,
    JwtAuthGuard,
    RefreshJwtGuard,
    JwtAuthStrategy,
    RefreshJwtStrategy,
  ],
  exports: [AuthService, RefreshTokenService, JwtAuthGuard],
})
export class AuthModule {}

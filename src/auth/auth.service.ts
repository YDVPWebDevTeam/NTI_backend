import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { User } from '../../generated/prisma/client';
import { UserStatus } from '../../generated/prisma/enums';
import { ConfigService } from '../infrastructure/config';
import { HashingService } from '../infrastructure/hashing';
import { RefreshTokenService } from './refresh-token/refresh-token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import type { JwtPayload } from './types/jwt-payload.type';
import type { RefreshJwtPayload } from './types/refresh-jwt-payload.type';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { ResetTokenService } from './reset-token/reset-token.service';

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUserContext;
};

export type MessageResponse = {
  message: string;
};

const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  'If the email exists, a reset link was sent.';
const RESET_PASSWORD_SUCCESS_MESSAGE = 'Password reset successfully.';
const INVALID_RESET_TOKEN_MESSAGE = 'Invalid or expired password reset token';

@Injectable()
export class AuthService {
  public readonly refreshTokenValidityDays: number;

  constructor(
    private readonly usersService: UserService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtService: JwtService,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly resetTokenService: ResetTokenService,
    private readonly queueService: QueueService,
  ) {
    this.refreshTokenValidityDays = parseInt(
      this.configService.jwtRefreshExpirationDays,
    );
  }

  async register(dto: RegisterDto): Promise<AuthenticatedUserContext> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await this.hashingService.hashStrong(dto.password);

    const { user, verificationToken } = await this.usersService.transaction(
      async (transaction) => {
        const user = await this.usersService.create(
          {
            email: dto.email,
            name: dto.name,
            passwordHash,
          },
          transaction,
        );

        const verificationToken =
          await this.emailVerificationService.createForUser(
            user.id,
            transaction,
          );

        return { user, verificationToken };
      },
    );

    await this.queueService.addEmail(EMAIL_JOBS.USER_CONFIRMATION, {
      email: user.email,
      token: verificationToken.token,
    });

    return this.usersService.bareSafeUser(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.ensureUserCanAuthenticate(user);

    const isPasswordValid = await this.hashingService.verifyStrong(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueAuthTokens(user);
  }

  async refresh(
    authUser: AuthenticatedUserContext,
  ): Promise<AuthTokensResponse> {
    if (!authUser.refreshTokenId) {
      throw new UnauthorizedException('Refresh token context is required');
    }

    const user = await this.usersService.findById(authUser.id);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    this.ensureUserCanAuthenticate(user);

    await this.refreshTokenService.revokeById(authUser.refreshTokenId);

    return this.issueAuthTokens(user);
  }

  async logout(refreshTokenId: string): Promise<void> {
    await this.refreshTokenService.revokeById(refreshTokenId);
  }

  private ensureUserCanAuthenticate(user: User): void {
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('User account is suspended');
    }

    if (!user.isEmailConfirmed) {
      throw new UnauthorizedException('Email confirmation is required');
    }
  }

  async confirmEmail(token: string): Promise<AuthTokensResponse> {
    const verificationToken =
      await this.emailVerificationService.validateTokenOrThrow(token);
    const user = await this.usersService.findById(verificationToken.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const confirmedUser = await this.usersService.transaction(
      async (transaction) => {
        const updatedUser = await this.usersService.markEmailConfirmed(
          user.id,
          transaction,
        );
        await this.emailVerificationService.markAccepted(
          verificationToken.id,
          transaction,
        );
        return updatedUser;
      },
    );

    return this.issueAuthTokens(confirmedUser);
  }

  async resendConfirmationEmail(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    // Avoid revealing whether the account exists or has already been confirmed.
    if (!user || user.isEmailConfirmed) {
      return;
    }

    const verificationToken = await this.emailVerificationService.createForUser(
      user.id,
    );

    await this.queueService.addEmail(EMAIL_JOBS.USER_CONFIRMATION, {
      email: user.email,
      token: verificationToken.token,
    });
  }

  async forgotPassword(email: string): Promise<MessageResponse> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return { message: FORGOT_PASSWORD_SUCCESS_MESSAGE };
    }

    const resetToken = await this.resetTokenService.createForUser(user.id);

    await this.queueService.addEmail(EMAIL_JOBS.PASSWORD_RESET, {
      userId: user.id,
      email: user.email,
      token: resetToken.token,
    });

    return { message: FORGOT_PASSWORD_SUCCESS_MESSAGE };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<MessageResponse> {
    await this.usersService.transaction(async (transaction) => {
      const resetToken = await this.resetTokenService.consumeByToken(
        token,
        transaction,
      );

      if (!resetToken) {
        throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
      }

      await this.usersService.update(
        resetToken.userId,
        {
          passwordHash: await this.hashingService.hashStrong(newPassword),
        },
        transaction,
      );
      await this.usersService.markEmailConfirmed(
        resetToken.userId,
        transaction,
      );
      await this.refreshTokenService.revokeAllActiveByUserId(
        resetToken.userId,
        transaction,
      );
    });

    return { message: RESET_PASSWORD_SUCCESS_MESSAGE };
  }

  private async issueAuthTokens(user: User): Promise<AuthTokensResponse> {
    const safeUser = this.usersService.bareSafeUser(user);

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload);

    const refreshTokenId = randomUUID();

    const refreshPayload: RefreshJwtPayload = {
      sub: user.id,
      email: user.email,
      refreshTokenId,
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.jwtRefreshSecret,
      expiresIn: this.configService.jwtRefreshExpirationDays,
    });

    const refreshTokenHash = await this.hashingService.hashStrong(refreshToken);

    await this.refreshTokenService.create({
      id: refreshTokenId,
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: this.resolveExpirationDate(
        this.configService.jwtRefreshExpirationDays,
      ),
    });

    return {
      accessToken,
      refreshToken,
      user: safeUser,
    };
  }

  private resolveExpirationDate(duration: string): Date {
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new Error(`Unsupported duration format: ${duration}`);
    }

    const value = Number(match[1]);
    const unit = match[2];

    const multiplier = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    }[unit];

    if (!multiplier) {
      throw new Error(`Unsupported duration unit: ${unit}`);
    }

    return new Date(Date.now() + value * multiplier);
  }
}

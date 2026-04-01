import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
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
import { MailerService } from 'src/infrastructure/mailer/mailer.service';

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string | null;
  user: AuthenticatedUserContext;
};

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
    private readonly mailerService: MailerService,
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

    const passwordHash = await this.hashingService.hash(dto.password);

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

    await this.mailerService.sendConfirmationEmail(
      user.email,
      verificationToken.token,
    );

    return this.usersService.bareSafeUser(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.ensureUserCanAuthenticate(user);

    const isPasswordValid = await this.hashingService.verify(
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

    if (user.isEmailConfirmed === false) {
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

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailConfirmed) {
      throw new BadRequestException('Email is already confirmed');
    }

    const verificationToken = await this.emailVerificationService.createForUser(
      user.id,
    );

    await this.mailerService.sendConfirmationEmail(
      user.email,
      verificationToken.token,
    );
  }

  private async issueAuthTokens(
    user: User,
    doRefresh: boolean = true,
  ): Promise<AuthTokensResponse> {
    const safeUser = this.usersService.bareSafeUser(user);

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload);

    let refreshToken: string | null = null;
    if (doRefresh) {
      const refreshTokenId = randomUUID();

      const refreshPayload: RefreshJwtPayload = {
        sub: user.id,
        email: user.email,
        refreshTokenId,
      };

      refreshToken = await this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.jwtRefreshSecret,
        expiresIn: this.configService.jwtRefreshExpirationDays,
      });

      const refreshTokenHash = await this.hashingService.hash(refreshToken);

      await this.refreshTokenService.create({
        id: refreshTokenId,
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: this.resolveExpirationDate(
          this.configService.jwtRefreshExpirationDays,
        ),
      });
    }

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

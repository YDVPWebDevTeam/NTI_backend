import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { StringValue } from 'ms';
import type { User } from '../../generated/prisma/client';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
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
import { MailerService } from '../infrastructure/mailer/mailer.service';

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUserContext;
};

export type PasswordChangeRequiredResponse = {
  requiresPasswordChange: true;
  requiresPasswordChangeToken: string;
};

export type LoginResponse = AuthTokensResponse | PasswordChangeRequiredResponse;

export const FORCE_PASSWORD_CHANGE_PURPOSE = 'force_password_change' as const;

type ForcePasswordChangeTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  purpose: typeof FORCE_PASSWORD_CHANGE_PURPOSE;
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

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.authenticateByCredentials(dto);
    this.ensureRoleMatchesLoginEndpoint(user, { requireAdmin: false });

    return this.resolveLoginResponse(user);
  }

  async adminLogin(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.authenticateByCredentials(dto);
    this.ensureRoleMatchesLoginEndpoint(user, { requireAdmin: true });

    return this.resolveLoginResponse(user);
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
    if (this.shouldRequirePasswordChange(user)) {
      await this.refreshTokenService.revokeById(authUser.refreshTokenId);
      throw new UnauthorizedException('Password change is required');
    }

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

    await this.mailerService.sendConfirmationEmail(
      user.email,
      verificationToken.token,
    );
  }

  async forceChangePassword(
    tempToken: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<AuthTokensResponse> {
    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const tokenPayload =
      await this.validateForcePasswordChangeTokenOrThrow(tempToken);
    const user = await this.usersService.findById(tokenPayload.sub);

    if (!user || user.email !== tokenPayload.email) {
      throw new UnauthorizedException(
        'Invalid or expired password change token',
      );
    }

    if (!this.isAdminRole(user.role) || !user.mustChangePassword) {
      throw new UnauthorizedException(
        'Invalid or expired password change token',
      );
    }

    this.ensureUserCanAuthenticate(user);

    const passwordHash = await this.hashingService.hash(newPassword);

    const updatedUser = await this.usersService.update(user.id, {
      passwordHash,
      mustChangePassword: false,
    });

    const activeRefreshTokens =
      await this.refreshTokenService.findActiveByUserId(user.id);

    await Promise.all(
      activeRefreshTokens.map((refreshToken) =>
        this.refreshTokenService.revokeById(refreshToken.id),
      ),
    );

    return this.issueAuthTokens(updatedUser);
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

    const refreshTokenHash = await this.hashingService.hash(refreshToken);

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

  private async authenticateByCredentials(dto: LoginDto): Promise<User> {
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

    return user;
  }

  private async resolveLoginResponse(user: User): Promise<LoginResponse> {
    if (!this.shouldRequirePasswordChange(user)) {
      return this.issueAuthTokens(user);
    }

    return {
      requiresPasswordChange: true,
      requiresPasswordChangeToken:
        await this.issueForcePasswordChangeToken(user),
    };
  }

  private shouldRequirePasswordChange(user: User): boolean {
    return this.isAdminRole(user.role) && user.mustChangePassword;
  }

  private isAdminRole(role: UserRole): boolean {
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  }

  private ensureRoleMatchesLoginEndpoint(
    user: User,
    options: { requireAdmin: boolean },
  ): void {
    const isAdmin = this.isAdminRole(user.role);
    if (options.requireAdmin !== isAdmin) {
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  private issueForcePasswordChangeToken(user: User): Promise<string> {
    const payload: ForcePasswordChangeTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      purpose: FORCE_PASSWORD_CHANGE_PURPOSE,
    };

    const expiresIn =
      `${this.configService.forcePasswordChangeTokenExpirationMinutes}m` as StringValue;

    // Use a dedicated secret so this token cannot be replayed as a normal Bearer access token.
    return this.jwtService.signAsync(payload, {
      secret: this.configService.jwtForcePasswordChangeSecret,
      expiresIn,
    });
  }

  private async validateForcePasswordChangeTokenOrThrow(
    token: string,
  ): Promise<ForcePasswordChangeTokenPayload> {
    try {
      const payload =
        await this.jwtService.verifyAsync<ForcePasswordChangeTokenPayload>(
          token,
          {
            // Must match the dedicated signing secret used for password-change challenge tokens.
            secret: this.configService.jwtForcePasswordChangeSecret,
          },
        );

      if (payload.purpose !== FORCE_PASSWORD_CHANGE_PURPOSE) {
        throw new UnauthorizedException(
          'Invalid or expired password change token',
        );
      }

      return payload;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired password change token',
      );
    }
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

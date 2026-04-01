jest.mock('../user/user.service', () => ({
  UserService: class UserService {},
}));

jest.mock('../infrastructure/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('../infrastructure/hashing', () => ({
  HashingService: class HashingService {},
}));

jest.mock('./refresh-token/refresh-token.service', () => ({
  RefreshTokenService: class RefreshTokenService {},
}));

jest.mock('./email-verification/email-verification.service', () => ({
  EmailVerificationService: class EmailVerificationService {},
}));

jest.mock('../infrastructure/mailer/mailer.service', () => ({
  MailerService: class MailerService {},
}));

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { PrismaDbClient } from '../infrastructure/database';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import { ConfigService } from '../infrastructure/config';
import { HashingService } from '../infrastructure/hashing';
import { MailerService } from '../infrastructure/mailer/mailer.service';
import { UserService } from '../user/user.service';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token/refresh-token.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: {
    findByEmail: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    markEmailConfirmed: jest.Mock;
    bareSafeUser: jest.Mock;
    transaction: jest.Mock;
  };
  let refreshTokens: {
    create: jest.Mock;
    revokeById: jest.Mock;
  };
  let emailVerification: {
    createForUser: jest.Mock;
    validateTokenOrThrow: jest.Mock;
    markAccepted: jest.Mock;
  };
  let mailer: {
    sendConfirmationEmail: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let hashingService: {
    hash: jest.Mock;
    verify: jest.Mock;
  };

  const user = {
    id: 'user-1',
    email: 'student@example.com',
    name: 'Student',
    passwordHash: 'stored-hash',
    role: UserRole.STUDENT,
    status: UserStatus.PENDING,
    isEmailConfirmed: true,
  };

  const unconfirmedUser = {
    ...user,
    isEmailConfirmed: false,
  };

  const safeUser = {
    id: 'user-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.PENDING,
  };
  const transactionClient = {} as PrismaDbClient;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      markEmailConfirmed: jest.fn(),
      bareSafeUser: jest.fn().mockReturnValue(safeUser),
      transaction: jest
        .fn()
        .mockImplementation((fn: (db: PrismaDbClient) => Promise<unknown>) =>
          fn(transactionClient),
        ),
    };
    refreshTokens = {
      create: jest.fn(),
      revokeById: jest.fn(),
    };
    emailVerification = {
      createForUser: jest.fn(),
      validateTokenOrThrow: jest.fn(),
      markAccepted: jest.fn(),
    };
    mailer = {
      sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    };
    hashingService = {
      hash: jest
        .fn()
        .mockResolvedValueOnce('password-hash')
        .mockResolvedValue('refresh-token-hash'),
      verify: jest.fn().mockResolvedValue(true),
    };

    service = new AuthService(
      users as unknown as UserService,
      refreshTokens as unknown as RefreshTokenService,
      jwtService as unknown as JwtService,
      hashingService as unknown as HashingService,
      {
        jwtRefreshSecret: '12345678901234567890123456789012',
        jwtRefreshExpirationDays: '7d',
      } as unknown as ConfigService,
      emailVerification as unknown as EmailVerificationService,
      mailer as unknown as MailerService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers a user and sends a verification email', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue(unconfirmedUser);
    emailVerification.createForUser.mockResolvedValue({
      id: 'verification-1',
      userId: user.id,
      token: 'verification-token',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      acceptedAt: null,
    });

    const result = await service.register({
      email: user.email,
      name: user.name,
      password: 'strongpass123',
    });

    expect(users.findByEmail).toHaveBeenCalledWith(user.email);
    expect(hashingService.hash).toHaveBeenCalledWith('strongpass123');
    expect(users.transaction).toHaveBeenCalled();
    expect(users.create).toHaveBeenCalledWith(
      {
        email: user.email,
        name: user.name,
        passwordHash: 'password-hash',
      },
      transactionClient,
    );
    expect(emailVerification.createForUser).toHaveBeenCalledWith(
      user.id,
      transactionClient,
    );
    expect(mailer.sendConfirmationEmail).toHaveBeenCalledWith(
      user.email,
      'verification-token',
    );
    expect(result).toEqual(safeUser);
  });

  it('throws on register when email is already taken', async () => {
    users.findByEmail.mockResolvedValue(user);

    await expect(
      service.register({
        email: user.email,
        name: user.name,
        password: 'strongpass123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in a confirmed user and returns tokens', async () => {
    users.findByEmail.mockResolvedValue(user);

    const result = await service.login({
      email: user.email,
      password: 'strongpass123',
    });

    expect(hashingService.verify).toHaveBeenCalledWith(
      user.passwordHash,
      'strongpass123',
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: safeUser,
    });
  });

  it('throws on login when password is invalid', async () => {
    users.findByEmail.mockResolvedValue(user);
    hashingService.verify.mockResolvedValue(false);

    await expect(
      service.login({
        email: user.email,
        password: 'wrongpass123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws on login when email is not confirmed', async () => {
    users.findByEmail.mockResolvedValue(unconfirmedUser);

    await expect(
      service.login({
        email: user.email,
        password: 'strongpass123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes tokens and revokes the previous refresh token', async () => {
    users.findById.mockResolvedValue(user);

    const result = await service.refresh({
      ...safeUser,
      refreshTokenId: 'refresh-token-id',
    });

    expect(refreshTokens.revokeById).toHaveBeenCalledWith('refresh-token-id');
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: safeUser,
    });
  });

  it('throws on refresh when refresh token context is missing', async () => {
    await expect(service.refresh(safeUser)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('confirms email and returns tokens', async () => {
    emailVerification.validateTokenOrThrow.mockResolvedValue({
      id: 'verification-1',
      userId: user.id,
      token: 'verification-token',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      acceptedAt: null,
    });
    users.findById.mockResolvedValue(unconfirmedUser);
    users.markEmailConfirmed.mockResolvedValue(user);

    const result = await service.confirmEmail('verification-token');

    expect(emailVerification.validateTokenOrThrow).toHaveBeenCalledWith(
      'verification-token',
    );
    expect(users.markEmailConfirmed).toHaveBeenCalledWith(
      user.id,
      transactionClient,
    );
    expect(emailVerification.markAccepted).toHaveBeenCalledWith(
      'verification-1',
      transactionClient,
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: safeUser,
    });
  });

  it('throws on resend confirmation email for missing user', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      service.resendConfirmationEmail('missing@example.com'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws on resend confirmation email for confirmed user', async () => {
    users.findByEmail.mockResolvedValue(user);

    await expect(
      service.resendConfirmationEmail(user.email),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

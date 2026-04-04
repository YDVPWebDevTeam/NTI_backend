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

jest.mock('./reset-token/reset-token.service', () => ({
  ResetTokenService: class ResetTokenService {},
}));

jest.mock('../infrastructure/queue', () => ({
  EMAIL_JOBS: {
    PASSWORD_RESET: 'password-reset',
    USER_CONFIRMATION: 'user-confirmation',
    TEAM_CONFIRMATION: 'team-confirmation',
  },
  QueueService: class QueueService {},
}));

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { PrismaDbClient } from '../infrastructure/database';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import { ConfigService } from '../infrastructure/config';
import { HashingService } from '../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { UserService } from '../user/user.service';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token/refresh-token.service';
import { ResetTokenService } from './reset-token/reset-token.service';

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
  let resetTokens: {
    createForUser: jest.Mock;
    findByToken: jest.Mock;
    markUsed: jest.Mock;
  };
  let queueService: {
    addEmail: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let hashingService: {
    hashStrong: jest.Mock;
    verifyStrong: jest.Mock;
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
    resetTokens = {
      createForUser: jest.fn(),
      findByToken: jest.fn(),
      markUsed: jest.fn(),
    };
    queueService = {
      addEmail: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    };
    hashingService = {
      hashStrong: jest
        .fn()
        .mockResolvedValueOnce('password-hash')
        .mockResolvedValue('refresh-token-hash'),
      verifyStrong: jest.fn().mockResolvedValue(true),
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
      resetTokens as unknown as ResetTokenService,
      queueService as unknown as QueueService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers a user and enqueues a verification email', async () => {
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
    expect(hashingService.hashStrong).toHaveBeenCalledWith('strongpass123');
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
    expect(queueService.addEmail).toHaveBeenCalledWith(
      EMAIL_JOBS.USER_CONFIRMATION,
      {
        email: user.email,
        token: 'verification-token',
      },
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

    expect(hashingService.verifyStrong).toHaveBeenCalledWith(
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
    hashingService.verifyStrong.mockResolvedValue(false);

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

  it('resends confirmation email for an unconfirmed user', async () => {
    users.findByEmail.mockResolvedValue(unconfirmedUser);
    emailVerification.createForUser.mockResolvedValue({
      id: 'verification-2',
      userId: user.id,
      token: 'new-verification-token',
      expiresAt: new Date('2030-01-02T00:00:00.000Z'),
      acceptedAt: null,
    });

    await expect(
      service.resendConfirmationEmail(unconfirmedUser.email),
    ).resolves.toBeUndefined();

    expect(emailVerification.createForUser).toHaveBeenCalledWith(user.id);
    expect(queueService.addEmail).toHaveBeenCalledWith(
      EMAIL_JOBS.USER_CONFIRMATION,
      {
        email: unconfirmedUser.email,
        token: 'new-verification-token',
      },
    );
  });

  it('returns success without revealing missing accounts', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      service.resendConfirmationEmail('missing@example.com'),
    ).resolves.toBeUndefined();
    expect(emailVerification.createForUser).not.toHaveBeenCalled();
    expect(queueService.addEmail).not.toHaveBeenCalled();
  });

  it('returns success without revealing confirmed accounts', async () => {
    users.findByEmail.mockResolvedValue(user);

    await expect(
      service.resendConfirmationEmail(user.email),
    ).resolves.toBeUndefined();
    expect(emailVerification.createForUser).not.toHaveBeenCalled();
    expect(queueService.addEmail).not.toHaveBeenCalled();
  });
});

jest.mock('../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

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

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { PrismaDbClient } from '../infrastructure/database';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import { ConfigService } from '../infrastructure/config';
import { HashingService } from '../infrastructure/hashing';
import { UserService } from '../user/user.service';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { AuthService, FORCE_PASSWORD_CHANGE_PURPOSE } from './auth.service';
import { RefreshTokenService } from './refresh-token/refresh-token.service';
import { QueueService } from '../infrastructure/queue';
import { EMAIL_JOBS } from '../infrastructure/queue/queue.types';

describe('AuthService', () => {
  let service: AuthService;
  let users: {
    findByEmail: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    markEmailConfirmed: jest.Mock;
    bareSafeUser: jest.Mock;
    transaction: jest.Mock;
  };
  let refreshTokens: {
    create: jest.Mock;
    revokeById: jest.Mock;
    findActiveByUserId: jest.Mock;
  };
  let emailVerification: {
    createForUser: jest.Mock;
    validateTokenOrThrow: jest.Mock;
    markAccepted: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let hashingService: {
    hash: jest.Mock;
    verify: jest.Mock;
  };
  let queueService: {
    addEmail: jest.Mock;
  };

  const user = {
    id: 'user-1',
    email: 'student@example.com',
    name: 'Student',
    passwordHash: 'stored-hash',
    role: UserRole.STUDENT,
    status: UserStatus.PENDING,
    isEmailConfirmed: true,
    mustChangePassword: false,
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
      update: jest.fn(),
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
      findActiveByUserId: jest.fn().mockResolvedValue([]),
    };
    emailVerification = {
      createForUser: jest.fn(),
      validateTokenOrThrow: jest.fn(),
      markAccepted: jest.fn(),
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
      verifyAsync: jest.fn(),
    };
    hashingService = {
      hash: jest
        .fn()
        .mockResolvedValueOnce('password-hash')
        .mockResolvedValue('refresh-token-hash'),
      verify: jest.fn().mockResolvedValue(true),
    };

    queueService = {
      addEmail: jest.fn(),
    };

    service = new AuthService(
      users as unknown as UserService,
      refreshTokens as unknown as RefreshTokenService,
      jwtService as unknown as JwtService,
      hashingService as unknown as HashingService,
      {
        jwtAccessSecret: '12345678901234567890123456789012',
        jwtRefreshSecret: '12345678901234567890123456789012',
        jwtForcePasswordChangeSecret: 'abcdefghijklmnopqrstuvwxyz123456',
        jwtRefreshExpirationDays: '7d',
        forcePasswordChangeTokenExpirationMinutes: 15,
      } as unknown as ConfigService,
      emailVerification as unknown as EmailVerificationService,
      queueService as unknown as QueueService,
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

  it('rejects admin account on default login endpoint', async () => {
    users.findByEmail.mockResolvedValue({
      ...user,
      role: UserRole.SUPER_ADMIN,
      mustChangePassword: true,
    });

    await expect(
      service.login({
        email: 'admin@nti.sk',
        password: 'TempPass123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows admin login only for admin roles', async () => {
    users.findByEmail.mockResolvedValue(user);

    await expect(
      service.adminLogin({
        email: user.email,
        password: 'strongpass123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns password-change challenge for admin users that require it', async () => {
    users.findByEmail.mockResolvedValue({
      ...user,
      role: UserRole.SUPER_ADMIN,
      email: 'admin@nti.sk',
      mustChangePassword: true,
    });
    jwtService.signAsync.mockReset().mockResolvedValueOnce('challenge-token');

    const result = await service.adminLogin({
      email: 'admin@nti.sk',
      password: 'TempPass123!',
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
        email: 'admin@nti.sk',
        purpose: FORCE_PASSWORD_CHANGE_PURPOSE,
      }),
      expect.objectContaining({
        secret: 'abcdefghijklmnopqrstuvwxyz123456',
      }),
    );
    expect(result).toEqual({
      requiresPasswordChange: true,
      requiresPasswordChangeToken: 'challenge-token',
    });
  });

  it('force-changes password, clears flag, and returns auth tokens', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'admin@nti.sk',
      role: UserRole.SUPER_ADMIN,
      purpose: FORCE_PASSWORD_CHANGE_PURPOSE,
    });
    users.findById.mockResolvedValue({
      ...user,
      email: 'admin@nti.sk',
      role: UserRole.SUPER_ADMIN,
      mustChangePassword: true,
    });
    users.update.mockResolvedValue({
      ...user,
      email: 'admin@nti.sk',
      role: UserRole.SUPER_ADMIN,
      mustChangePassword: false,
    });
    refreshTokens.findActiveByUserId.mockResolvedValue([
      { id: 'rt-1' },
      { id: 'rt-2' },
    ]);

    const result = await service.forceChangePassword(
      'temp-token',
      'NewStrongPass123!',
      'NewStrongPass123!',
    );

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('temp-token', {
      secret: 'abcdefghijklmnopqrstuvwxyz123456',
    });
    expect(users.transaction).toHaveBeenCalled();
    expect(users.update).toHaveBeenCalledWith(
      'user-1',
      {
        passwordHash: 'password-hash',
        mustChangePassword: false,
      },
      transactionClient,
    );
    expect(refreshTokens.findActiveByUserId).toHaveBeenCalledWith(
      'user-1',
      transactionClient,
    );
    expect(refreshTokens.revokeById).toHaveBeenCalledWith(
      'rt-1',
      transactionClient,
    );
    expect(refreshTokens.revokeById).toHaveBeenCalledWith(
      'rt-2',
      transactionClient,
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

  it('rejects refresh when forced password change is required', async () => {
    users.findById.mockResolvedValue({
      ...user,
      role: UserRole.SUPER_ADMIN,
      mustChangePassword: true,
    });

    await expect(
      service.refresh({
        ...safeUser,
        refreshTokenId: 'refresh-token-id',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(refreshTokens.revokeById).toHaveBeenCalledWith('refresh-token-id');
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

  it('throws generic credentials error for unconfirmed users with wrong password', async () => {
    users.findByEmail.mockResolvedValue(unconfirmedUser);
    hashingService.verify.mockResolvedValue(false);

    await expect(
      service.login({
        email: user.email,
        password: 'wrongpass123',
      }),
    ).rejects.toThrow('Invalid email or password');

    expect(hashingService.verify).toHaveBeenCalledWith(
      unconfirmedUser.passwordHash,
      'wrongpass123',
    );
  });
});

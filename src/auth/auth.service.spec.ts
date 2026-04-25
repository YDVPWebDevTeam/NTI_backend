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

jest.mock('./reset-token/reset-token.service', () => ({
  ResetTokenService: class ResetTokenService {},
}));

jest.mock('../invites/invites.service', () => ({
  InvitesService: class InvitesService {},
}));
jest.mock('./auth-registration.service', () => ({
  AuthRegistrationService: class AuthRegistrationService {},
}));

jest.mock('../infrastructure/queue', () => ({
  EMAIL_JOBS: {
    PASSWORD_RESET: 'password-reset',
    USER_CONFIRMATION: 'user-confirmation',
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
import { AuthService, FORCE_PASSWORD_CHANGE_PURPOSE } from './auth.service';
import { RefreshTokenService } from './refresh-token/refresh-token.service';
import { ResetTokenService } from './reset-token/reset-token.service';
import { AuthRegistrationService } from './auth-registration.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: {
    findByEmail: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    markEmailConfirmed: jest.Mock;
    transaction: jest.Mock;
  };
  let refreshTokens: {
    create: jest.Mock;
    revokeById: jest.Mock;
    findActiveByUserId: jest.Mock;
    revokeAllActiveByUserId: jest.Mock;
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
  let authRegistration: {
    register: jest.Mock;
    registerCompanyOwner: jest.Mock;
    registerViaInvite: jest.Mock;
  };
  let queueService: {
    addEmail: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let hashingService: {
    hashStrong: jest.Mock;
    verifyStrong: jest.Mock;
  };

  const user = {
    id: 'user-1',
    email: 'student@example.com',
    firstName: 'Student',
    lastName: 'User',
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
    organizationId: null,
  };
  const transactionClient = {} as PrismaDbClient;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      markEmailConfirmed: jest.fn(),
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
      revokeAllActiveByUserId: jest.fn().mockResolvedValue(undefined),
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
    authRegistration = {
      register: jest.fn(),
      registerCompanyOwner: jest.fn(),
      registerViaInvite: jest.fn(),
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
      verifyAsync: jest.fn(),
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
        jwtAccessSecret: '12345678901234567890123456789012',
        jwtRefreshSecret: '12345678901234567890123456789012',
        jwtForcePasswordChangeSecret: 'abcdefghijklmnopqrstuvwxyz123456',
        jwtRefreshExpirationDays: '7d',
        forcePasswordChangeTokenExpirationMinutes: 15,
      } as unknown as ConfigService,
      emailVerification as unknown as EmailVerificationService,
      resetTokens as unknown as ResetTokenService,
      queueService as unknown as QueueService,
      authRegistration as unknown as AuthRegistrationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers a user and enqueues a verification email', async () => {
    authRegistration.register.mockResolvedValue(safeUser);

    const result = await service.register({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: 'strongpass123',
    });

    expect(authRegistration.register).toHaveBeenCalledWith({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: 'strongpass123',
    });
    expect(result).toEqual(safeUser);
  });

  it('throws on register when email is already taken', async () => {
    authRegistration.register.mockRejectedValue(new ConflictException());

    await expect(
      service.register({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: 'strongpass123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('registers a confirmed user via invite and accepts the invitation', async () => {
    authRegistration.registerViaInvite.mockResolvedValue({
      message: 'Registration via invite completed successfully.',
    });

    const result = await service.registerViaInvite({
      firstName: 'Student',
      lastName: 'User',
      token: 'invite-token',
      password: 'strongpass123',
    });

    expect(authRegistration.registerViaInvite).toHaveBeenCalledWith({
      firstName: 'Student',
      lastName: 'User',
      token: 'invite-token',
      password: 'strongpass123',
    });
    expect(result).toEqual({
      message: 'Registration via invite completed successfully.',
    });
  });

  it('throws on invite registration when user already exists', async () => {
    authRegistration.registerViaInvite.mockRejectedValue(
      new ConflictException(),
    );

    await expect(
      service.registerViaInvite({
        firstName: 'Student',
        lastName: 'User',
        token: 'invite-token',
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
    expect(refreshTokens.revokeAllActiveByUserId).toHaveBeenCalledWith(
      'user-1',
      transactionClient,
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'admin@nti.sk',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.PENDING,
        organizationId: null,
      },
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
    hashingService.verifyStrong.mockResolvedValue(false);

    await expect(
      service.login({
        email: user.email,
        password: 'wrongpass123',
      }),
    ).rejects.toThrow('Invalid email or password');

    expect(hashingService.verifyStrong).toHaveBeenCalledWith(
      unconfirmedUser.passwordHash,
      'wrongpass123',
    );
  });
});

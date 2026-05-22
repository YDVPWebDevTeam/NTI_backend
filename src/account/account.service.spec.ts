jest.mock('../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('../user/user.service', () => ({
  UserService: class UserService {},
}));

jest.mock('../infrastructure/hashing', () => ({
  HashingService: class HashingService {},
}));

jest.mock('../auth/refresh-token/refresh-token.service', () => ({
  RefreshTokenService: class RefreshTokenService {},
}));

jest.mock('../infrastructure/queue', () => ({
  EMAIL_JOBS: {
    EMAIL_CHANGE_CONFIRMATION: 'email-change-confirmation',
  },
  QueueService: class QueueService {},
}));

jest.mock('./email-change-token.service', () => ({
  EmailChangeTokenService: class EmailChangeTokenService {},
}));

import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import type { PrismaDbClient } from '../infrastructure/database';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import { AccountService } from './account.service';
import { RefreshTokenService } from '../auth/refresh-token/refresh-token.service';
import { HashingService } from '../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { UserService } from '../user/user.service';
import { EmailChangeTokenService } from './email-change-token.service';
import { ACCOUNT_MESSAGES } from './account.messages';

describe('AccountService', () => {
  let service: AccountService;
  let users: {
    findById: jest.Mock;
    findByEmail: jest.Mock;
    update: jest.Mock;
    transaction: jest.Mock;
  };
  let hashing: {
    verifyStrong: jest.Mock;
    hashStrong: jest.Mock;
  };
  let refreshTokens: {
    revokeAllActiveByUserId: jest.Mock;
  };
  let queueService: {
    addEmail: jest.Mock;
  };
  let emailChangeTokens: {
    createForUser: jest.Mock;
    consumeByToken: jest.Mock;
  };

  const transactionClient = {} as PrismaDbClient;
  const authUser = {
    id: 'user-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    organizationId: null,
  };
  const storedUser = {
    id: 'user-1',
    email: 'student@example.com',
    passwordHash: 'stored-hash',
    mustChangePassword: false,
  };

  beforeEach(() => {
    users = {
      findById: jest.fn().mockResolvedValue(storedUser),
      findByEmail: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
      transaction: jest
        .fn()
        .mockImplementation((fn: (db: PrismaDbClient) => Promise<unknown>) =>
          fn(transactionClient),
        ),
    };
    hashing = {
      verifyStrong: jest.fn().mockResolvedValue(true),
      hashStrong: jest.fn().mockResolvedValue('new-password-hash'),
    };
    refreshTokens = {
      revokeAllActiveByUserId: jest.fn().mockResolvedValue(3),
    };
    queueService = {
      addEmail: jest.fn().mockResolvedValue(undefined),
    };
    emailChangeTokens = {
      createForUser: jest.fn().mockResolvedValue({
        token: 'email-change-token',
      }),
      consumeByToken: jest.fn().mockResolvedValue({
        userId: 'user-1',
        newEmail: 'new@example.com',
      }),
    };

    service = new AccountService(
      users as unknown as UserService,
      hashing as unknown as HashingService,
      refreshTokens as unknown as RefreshTokenService,
      queueService as unknown as QueueService,
      emailChangeTokens as unknown as EmailChangeTokenService,
    );
  });

  it('changes password and revokes active refresh sessions', async () => {
    hashing.verifyStrong
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await service.changePassword(
      authUser,
      'CurrentPass123',
      'NewStrongPass123',
    );

    expect(hashing.verifyStrong).toHaveBeenNthCalledWith(
      1,
      'stored-hash',
      'CurrentPass123',
    );
    expect(hashing.verifyStrong).toHaveBeenNthCalledWith(
      2,
      'stored-hash',
      'NewStrongPass123',
    );
    expect(hashing.hashStrong).toHaveBeenCalledWith('NewStrongPass123');
    expect(users.update).toHaveBeenCalledWith(
      'user-1',
      {
        passwordHash: 'new-password-hash',
        mustChangePassword: false,
      },
      transactionClient,
    );
    expect(refreshTokens.revokeAllActiveByUserId).toHaveBeenCalledWith(
      'user-1',
      transactionClient,
    );
    expect(result.message).toBe(ACCOUNT_MESSAGES.PASSWORD_CHANGED);
  });

  it('rejects invalid current password', async () => {
    hashing.verifyStrong.mockResolvedValue(false);

    await expect(
      service.changePassword(authUser, 'wrong', 'NewStrongPass123'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects using the same password', async () => {
    hashing.verifyStrong.mockResolvedValue(true);

    await expect(
      service.changePassword(authUser, 'CurrentPass123', 'CurrentPass123'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requests email change and sends a confirmation email', async () => {
    const result = await service.requestEmailChange(
      authUser,
      'new@example.com',
    );

    expect(emailChangeTokens.createForUser).toHaveBeenCalledWith(
      'user-1',
      'new@example.com',
    );
    expect(queueService.addEmail).toHaveBeenCalledWith(
      EMAIL_JOBS.EMAIL_CHANGE_CONFIRMATION,
      {
        email: 'new@example.com',
        token: 'email-change-token',
        newEmail: 'new@example.com',
      },
    );
    expect(result.message).toBe(ACCOUNT_MESSAGES.EMAIL_CHANGE_REQUESTED);
  });

  it('rejects requesting the same email', async () => {
    await expect(
      service.requestEmailChange(authUser, 'student@example.com'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects requesting an already used email', async () => {
    users.findByEmail.mockResolvedValue({ id: 'user-2' });

    await expect(
      service.requestEmailChange(authUser, 'taken@example.com'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirms email change and revokes active sessions', async () => {
    const result = await service.confirmEmailChange(authUser, 'token-123');

    expect(emailChangeTokens.consumeByToken).toHaveBeenCalledWith(
      'token-123',
      transactionClient,
    );
    expect(users.update).toHaveBeenCalledWith(
      'user-1',
      {
        email: 'new@example.com',
        isEmailConfirmed: true,
      },
      transactionClient,
    );
    expect(refreshTokens.revokeAllActiveByUserId).toHaveBeenCalledWith(
      'user-1',
      transactionClient,
    );
    expect(result.message).toBe(ACCOUNT_MESSAGES.EMAIL_CHANGED);
  });

  it('rejects invalid email change tokens', async () => {
    emailChangeTokens.consumeByToken.mockResolvedValue(null);

    await expect(
      service.confirmEmailChange(authUser, 'token-123'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects tokens that belong to another user', async () => {
    emailChangeTokens.consumeByToken.mockResolvedValue({
      userId: 'user-2',
      newEmail: 'new@example.com',
    });

    await expect(
      service.confirmEmailChange(authUser, 'token-123'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws unauthorized when the user no longer exists', async () => {
    users.findById.mockResolvedValue(null);

    await expect(
      service.requestEmailChange(authUser, 'new@example.com'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps unique email race to conflict on confirm', async () => {
    users.update.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.confirmEmailChange(authUser, 'token-123'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

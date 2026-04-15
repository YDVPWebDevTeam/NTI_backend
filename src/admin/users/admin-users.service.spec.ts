jest.mock('../../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('../../user/user.service', () => ({
  UserService: class UserService {},
}));

jest.mock('../../auth/refresh-token/refresh-token.service', () => ({
  RefreshTokenService: class RefreshTokenService {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import type { PrismaDbClient } from '../../infrastructure/database';
import { RefreshTokenService } from '../../auth/refresh-token/refresh-token.service';
import { UserService } from '../../user/user.service';
import { AdminUsersService } from './admin-users.service';
import { MANAGEABLE_USER_STATUSES } from './dto/update-user-status.dto';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let userService: {
    findById: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    transaction: jest.Mock;
    bareSafeUser: jest.Mock;
  };
  let refreshTokenService: {
    revokeAllActiveByUserId: jest.Mock;
  };

  const transactionClient = {} as PrismaDbClient;
  const actorAdmin: AuthenticatedUserContext = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  };
  const actorSuperAdmin: AuthenticatedUserContext = {
    id: 'super-admin-1',
    email: 'super-admin@example.com',
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
  };
  const actorStudent: AuthenticatedUserContext = {
    id: 'student-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  };
  const targetUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    passwordHash: 'hash',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    isEmailConfirmed: true,
    isAdminConfirmed: false,
    mustChangePassword: false,
    organizationId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  type BareSafeUserInput = Pick<
    typeof targetUser,
    'id' | 'email' | 'role' | 'status'
  >;

  beforeEach(() => {
    userService = {
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      transaction: jest
        .fn()
        .mockImplementation((fn: (db: PrismaDbClient) => Promise<unknown>) =>
          fn(transactionClient),
        ),
      bareSafeUser: jest.fn((user: BareSafeUserInput) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      })),
    };
    refreshTokenService = {
      revokeAllActiveByUserId: jest.fn(),
    };

    service = new AdminUsersService(
      userService as unknown as UserService,
      refreshTokenService as unknown as RefreshTokenService,
    );
  });

  it('throws when target user does not exist', async () => {
    userService.findById.mockResolvedValue(null);

    await expect(
      service.updateStatus(
        actorAdmin,
        'missing-user',
        MANAGEABLE_USER_STATUSES.ACTIVE,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns safe users list for admins', async () => {
    userService.findMany.mockResolvedValue([
      targetUser,
      {
        ...targetUser,
        id: 'user-2',
        email: 'user-2@example.com',
        role: UserRole.COMPANY_OWNER,
      },
    ]);

    const result = await service.getUsers(actorAdmin);

    expect(userService.findMany).toHaveBeenCalledWith();
    expect(result).toEqual([
      {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status,
      },
      {
        id: 'user-2',
        email: 'user-2@example.com',
        role: UserRole.COMPANY_OWNER,
        status: targetUser.status,
      },
    ]);
  });

  it('throws forbidden when non-admin requests users list', async () => {
    await expect(service.getUsers(actorStudent)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(userService.findMany).not.toHaveBeenCalled();
  });

  it('returns safe user by id for admins', async () => {
    userService.findById.mockResolvedValue(targetUser);

    const result = await service.getUserById(actorSuperAdmin, targetUser.id);

    expect(userService.findById).toHaveBeenCalledWith(targetUser.id);
    expect(result).toEqual({
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      status: targetUser.status,
    });
  });

  it('throws forbidden when non-admin requests user by id', async () => {
    await expect(
      service.getUserById(actorStudent, targetUser.id),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(userService.findById).not.toHaveBeenCalled();
  });

  it('throws not found when requested user id does not exist', async () => {
    userService.findById.mockResolvedValue(null);

    await expect(
      service.getUserById(actorAdmin, 'missing-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows admin to suspend a regular user and revokes active refresh tokens', async () => {
    userService.findById.mockResolvedValue(targetUser);
    userService.update.mockResolvedValue({
      ...targetUser,
      status: UserStatus.SUSPENDED,
    });

    const result = await service.updateStatus(
      actorAdmin,
      targetUser.id,
      MANAGEABLE_USER_STATUSES.SUSPENDED,
    );

    expect(userService.transaction).toHaveBeenCalled();
    expect(userService.update).toHaveBeenCalledWith(
      targetUser.id,
      { status: UserStatus.SUSPENDED },
      transactionClient,
    );
    expect(refreshTokenService.revokeAllActiveByUserId).toHaveBeenCalledWith(
      targetUser.id,
      transactionClient,
    );
    expect(result).toEqual({
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      status: UserStatus.SUSPENDED,
    });
  });

  it('allows admin to reactivate a regular user without revoking tokens', async () => {
    userService.findById.mockResolvedValue({
      ...targetUser,
      status: UserStatus.SUSPENDED,
    });
    userService.update.mockResolvedValue({
      ...targetUser,
      status: UserStatus.ACTIVE,
    });

    await service.updateStatus(
      actorAdmin,
      targetUser.id,
      MANAGEABLE_USER_STATUSES.ACTIVE,
    );

    expect(userService.update).toHaveBeenCalledWith(
      targetUser.id,
      { status: UserStatus.ACTIVE },
      transactionClient,
    );
    expect(refreshTokenService.revokeAllActiveByUserId).not.toHaveBeenCalled();
  });

  it('blocks admin from changing a super admin status', async () => {
    userService.findById.mockResolvedValue({
      ...targetUser,
      id: 'super-admin-2',
      role: UserRole.SUPER_ADMIN,
    });

    await expect(
      service.updateStatus(
        actorAdmin,
        'super-admin-2',
        MANAGEABLE_USER_STATUSES.SUSPENDED,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(userService.update).not.toHaveBeenCalled();
  });

  it('blocks admin from changing another admin status', async () => {
    userService.findById.mockResolvedValue({
      ...targetUser,
      id: 'admin-2',
      role: UserRole.ADMIN,
    });

    await expect(
      service.updateStatus(
        actorAdmin,
        'admin-2',
        MANAGEABLE_USER_STATUSES.SUSPENDED,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(userService.update).not.toHaveBeenCalled();
  });

  it('blocks self suspension for privileged users', async () => {
    userService.findById.mockResolvedValue({
      ...targetUser,
      id: actorSuperAdmin.id,
      role: UserRole.SUPER_ADMIN,
    });

    await expect(
      service.updateStatus(
        actorSuperAdmin,
        actorSuperAdmin.id,
        MANAGEABLE_USER_STATUSES.SUSPENDED,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(userService.update).not.toHaveBeenCalled();
  });

  it('allows super admin to reactivate another super admin', async () => {
    userService.findById.mockResolvedValue({
      ...targetUser,
      id: 'super-admin-2',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.SUSPENDED,
    });
    userService.update.mockResolvedValue({
      ...targetUser,
      id: 'super-admin-2',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });

    const result = await service.updateStatus(
      actorSuperAdmin,
      'super-admin-2',
      MANAGEABLE_USER_STATUSES.ACTIVE,
    );

    expect(result).toEqual({
      id: 'super-admin-2',
      email: targetUser.email,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
  });
});

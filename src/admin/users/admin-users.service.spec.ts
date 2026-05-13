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
import { UserRepository } from '../../user/user.repository';
import { AdminUsersService } from './admin-users.service';
import { MANAGEABLE_USER_STATUSES } from './dto/update-user-status.dto';
import type { ListUsersQueryDto } from './dto/list-users-query.dto';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let userService: {
    findById: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    transaction: jest.Mock;
  };
  let userRepository: {
    findManyPaginated: jest.Mock;
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
    organizationId: null,
  };
  const actorSuperAdmin: AuthenticatedUserContext = {
    id: 'super-admin-1',
    email: 'super-admin@example.com',
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    organizationId: null,
  };
  const actorStudent: AuthenticatedUserContext = {
    id: 'student-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    organizationId: null,
  };
  const targetUser = {
    id: 'user-1',
    email: 'user@example.com',
    firstName: 'User',
    lastName: 'Test',
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

  const defaultQuery: ListUsersQueryDto = {
    page: 1,
    limit: 20,
    sort: 'createdAt',
    order: 'desc',
  };

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
    };
    userRepository = {
      findManyPaginated: jest.fn(),
    };
    refreshTokenService = {
      revokeAllActiveByUserId: jest.fn(),
    };

    service = new AdminUsersService(
      userService as unknown as UserService,
      userRepository as unknown as UserRepository,
      refreshTokenService as unknown as RefreshTokenService,
    );
  });

  describe('listUsers', () => {
    it('returns paginated user list for admins', async () => {
      userRepository.findManyPaginated.mockResolvedValue({
        data: [targetUser],
        total: 1,
      });

      const result = await service.listUsers(actorAdmin, defaultQuery);

      expect(userRepository.findManyPaginated).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        role: targetUser.role,
        status: targetUser.status,
        organizationId: null,
      });
      expect(result.meta).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        sort: 'createdAt',
        order: 'desc',
      });
    });

    it('throws forbidden when non-admin requests users list', async () => {
      await expect(
        service.listUsers(actorStudent, defaultQuery),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(userRepository.findManyPaginated).not.toHaveBeenCalled();
    });

    it('passes q search as OR filter on email, firstName, lastName', async () => {
      userRepository.findManyPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.listUsers(actorAdmin, { ...defaultQuery, q: 'alice' });

      expect(userRepository.findManyPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { email: { contains: 'alice', mode: 'insensitive' } },
              { firstName: { contains: 'alice', mode: 'insensitive' } },
              { lastName: { contains: 'alice', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('passes role, status, organizationId as exact filters', async () => {
      userRepository.findManyPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.listUsers(actorAdmin, {
        ...defaultQuery,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        organizationId: 'org-1',
      });

      expect(userRepository.findManyPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            role: UserRole.STUDENT,
            status: UserStatus.ACTIVE,
            organizationId: 'org-1',
          },
        }),
      );
    });

    it('maps sort=name to firstName then lastName orderBy', async () => {
      userRepository.findManyPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.listUsers(actorAdmin, {
        ...defaultQuery,
        sort: 'name',
        order: 'asc',
      });

      expect(userRepository.findManyPaginated).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }],
        }),
      );
    });
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

  it('returns safe user by id for admins', async () => {
    userService.findById.mockResolvedValue(targetUser);

    const result = await service.getUserById(actorSuperAdmin, targetUser.id);

    expect(userService.findById).toHaveBeenCalledWith(targetUser.id);
    expect(result).toEqual({
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      status: targetUser.status,
      organizationId: null,
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
      organizationId: null,
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
      organizationId: null,
    });
  });
});

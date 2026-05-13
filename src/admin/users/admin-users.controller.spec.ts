jest.mock('./admin-users.service', () => ({
  AdminUsersService: class AdminUsersService {},
}));

import { UserRole, UserStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { MANAGEABLE_USER_STATUSES } from './dto/update-user-status.dto';
import type { ListUsersQueryDto } from './dto/list-users-query.dto';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let adminUsersService: {
    listUsers: jest.Mock;
    getUserById: jest.Mock;
    updateStatus: jest.Mock;
  };

  beforeEach(() => {
    adminUsersService = {
      listUsers: jest.fn(),
      getUserById: jest.fn(),
      updateStatus: jest.fn(),
    };

    controller = new AdminUsersController(
      adminUsersService as unknown as AdminUsersService,
    );
  });

  it('returns the updated safe user payload', async () => {
    const actor: AuthenticatedUserContext = {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: null,
    };

    adminUsersService.updateStatus.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.STUDENT,
      status: UserStatus.SUSPENDED,
    });

    const result = await controller.updateStatus(actor, 'user-1', {
      status: MANAGEABLE_USER_STATUSES.SUSPENDED,
    });

    expect(adminUsersService.updateStatus).toHaveBeenCalledWith(
      actor,
      'user-1',
      MANAGEABLE_USER_STATUSES.SUSPENDED,
    );
    expect(result).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.STUDENT,
      status: UserStatus.SUSPENDED,
    });
  });

  it('returns the paginated users list', async () => {
    const actor: AuthenticatedUserContext = {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: null,
    };
    const query: ListUsersQueryDto = {
      page: 1,
      limit: 20,
      sort: 'createdAt',
      order: 'desc',
    };
    const response = {
      data: [
        {
          id: 'user-1',
          email: 'user1@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          organizationId: null,
          createdAt: new Date(),
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        sort: 'createdAt',
        order: 'desc',
      },
    };
    adminUsersService.listUsers.mockResolvedValue(response);

    const result = await controller.getUsers(actor, query);

    expect(adminUsersService.listUsers).toHaveBeenCalledWith(actor, query);
    expect(result).toEqual(response);
  });

  it('returns one safe user by id', async () => {
    const actor: AuthenticatedUserContext = {
      id: 'super-admin-1',
      email: 'super-admin@example.com',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: null,
    };

    const user = {
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    };
    adminUsersService.getUserById.mockResolvedValue(user);

    const result = await controller.getUserById(actor, user.id);

    expect(adminUsersService.getUserById).toHaveBeenCalledWith(actor, user.id);
    expect(result).toEqual(user);
  });
});

jest.mock('./admin-users.service', () => ({
  AdminUsersService: class AdminUsersService {},
}));

import { UserRole, UserStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { MANAGEABLE_USER_STATUSES } from './dto/update-user-status.dto';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let adminUsersService: {
    getUsers: jest.Mock;
    getUserById: jest.Mock;
    updateStatus: jest.Mock;
  };

  beforeEach(() => {
    adminUsersService = {
      getUsers: jest.fn(),
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

  it('returns the safe users list', async () => {
    const actor: AuthenticatedUserContext = {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    };

    const users = [
      {
        id: 'user-1',
        email: 'user1@example.com',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
      {
        id: 'user-2',
        email: 'user2@example.com',
        role: UserRole.COMPANY_OWNER,
        status: UserStatus.PENDING,
      },
    ];
    adminUsersService.getUsers.mockResolvedValue(users);

    const result = await controller.getUsers(actor);

    expect(adminUsersService.getUsers).toHaveBeenCalledWith(actor);
    expect(result).toEqual(users);
  });

  it('returns one safe user by id', async () => {
    const actor: AuthenticatedUserContext = {
      id: 'super-admin-1',
      email: 'super-admin@example.com',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
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

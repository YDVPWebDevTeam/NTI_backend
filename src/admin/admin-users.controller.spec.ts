jest.mock('./admin-users.service', () => ({
  AdminUsersService: class AdminUsersService {},
}));

import { UserRole, UserStatus } from '../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { MANAGEABLE_USER_STATUSES } from './dto/update-user-status.dto';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let adminUsersService: {
    updateStatus: jest.Mock;
  };

  beforeEach(() => {
    adminUsersService = {
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
});

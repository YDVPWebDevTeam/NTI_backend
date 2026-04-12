jest.mock('./admin-invites.service', () => ({
  AdminInvitesService: class AdminInvitesService {},
}));

import {
  SystemInvitationStatus,
  UserRole,
  UserStatus,
} from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { AdminInvitesController } from './admin-invites.controller';
import { AdminInvitesService } from './admin-invites.service';
import { SYSTEM_INVITABLE_ROLES } from './dto/create-system-invite.dto';

describe('AdminInvitesController', () => {
  let controller: AdminInvitesController;
  let adminInvitesService: { createInvite: jest.Mock };

  beforeEach(() => {
    adminInvitesService = {
      createInvite: jest.fn(),
    };
    controller = new AdminInvitesController(
      adminInvitesService as unknown as AdminInvitesService,
    );
  });

  it('returns invite metadata', async () => {
    const actor: AuthenticatedUserContext = {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    };

    adminInvitesService.createInvite.mockResolvedValue({
      id: 'invite-1',
      email: 'mentor@example.com',
      roleToAssign: UserRole.MENTOR,
      status: SystemInvitationStatus.PENDING,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-04T00:00:00.000Z'),
    });

    const result = await controller.createInvite(actor, {
      email: 'mentor@example.com',
      roleToAssign: SYSTEM_INVITABLE_ROLES.MENTOR,
    });

    expect(adminInvitesService.createInvite).toHaveBeenCalledWith(actor, {
      email: 'mentor@example.com',
      roleToAssign: UserRole.MENTOR,
    });
    expect(result).toEqual({
      id: 'invite-1',
      email: 'mentor@example.com',
      roleToAssign: UserRole.MENTOR,
      status: SystemInvitationStatus.PENDING,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-04T00:00:00.000Z'),
    });
  });
});

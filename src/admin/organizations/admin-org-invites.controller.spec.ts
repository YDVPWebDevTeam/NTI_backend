jest.mock('./admin-org-invites.service', () => ({
  AdminOrgInvitesService: class AdminOrgInvitesService {},
}));

import {
  OrganizationStatus,
  UserRole,
  UserStatus,
} from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { AdminOrgInvitesController } from './admin-org-invites.controller';
import { AdminOrgInvitesService } from './admin-org-invites.service';

describe('AdminOrgInvitesController', () => {
  let controller: AdminOrgInvitesController;
  let service: {
    listAll: jest.Mock;
    listByOrganization: jest.Mock;
  };

  const actor: AuthenticatedUserContext = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    organizationId: null,
  };

  beforeEach(() => {
    service = {
      listAll: jest.fn(),
      listByOrganization: jest.fn(),
    };

    controller = new AdminOrgInvitesController(
      service as unknown as AdminOrgInvitesService,
    );
  });

  it('lists all organization applications', async () => {
    service.listAll.mockResolvedValue([
      {
        id: 'org-1',
        name: 'Acme Labs s.r.o.',
        ico: '12345678',
        status: OrganizationStatus.PENDING,
        website: null,
        sector: null,
        description: null,
        logoUrl: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const result = await controller.listAll(actor);

    expect(service.listAll).toHaveBeenCalledWith(actor);
    expect(result).toHaveLength(1);
  });

  it('gets organization application by organization id', async () => {
    service.listByOrganization.mockResolvedValue([
      {
        id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
        name: 'Acme Labs s.r.o.',
        ico: '12345678',
        status: OrganizationStatus.PENDING,
        website: null,
        sector: null,
        description: null,
        logoUrl: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    await controller.listByOrganization(
      actor,
      'd290f1ee-6c54-4b01-90e6-d701748f0851',
    );

    expect(service.listByOrganization).toHaveBeenCalledWith(
      actor,
      'd290f1ee-6c54-4b01-90e6-d701748f0851',
    );
  });
});

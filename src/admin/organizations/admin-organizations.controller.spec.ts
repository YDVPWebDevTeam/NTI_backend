jest.mock('./admin-organizations.service', () => ({
  AdminOrganizationsService: class AdminOrganizationsService {},
}));

import {
  OrganizationStatus,
  UserRole,
  UserStatus,
} from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { AdminOrganizationsController } from './admin-organizations.controller';
import { AdminOrganizationsService } from './admin-organizations.service';
import { MANAGEABLE_ORG_STATUSES } from './dto/update-org-status.dto';

describe('AdminOrganizationsController', () => {
  let controller: AdminOrganizationsController;
  let adminOrganizationsService: {
    updateStatus: jest.Mock;
    getOrganization: jest.Mock;
  };

  beforeEach(() => {
    adminOrganizationsService = {
      updateStatus: jest.fn(),
      getOrganization: jest.fn(),
    };

    controller = new AdminOrganizationsController(
      adminOrganizationsService as unknown as AdminOrganizationsService,
    );
  });

  it('returns updated organization payload', async () => {
    const actor: AuthenticatedUserContext = {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: null,
    };

    adminOrganizationsService.updateStatus.mockResolvedValue({
      id: 'org-1',
      name: 'Acme Labs s.r.o.',
      ico: '12345678',
      sector: null,
      description: null,
      website: null,
      logoUrl: null,
      status: OrganizationStatus.ACTIVE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const dto = { status: MANAGEABLE_ORG_STATUSES.ACTIVE };
    const result = await controller.updateStatus(actor, 'org-1', dto);

    expect(adminOrganizationsService.updateStatus).toHaveBeenCalledWith(
      actor,
      'org-1',
      dto,
    );
    expect(result.status).toBe(OrganizationStatus.ACTIVE);
  });

  it('returns organization payload with owner summary', async () => {
    const actor: AuthenticatedUserContext = {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: null,
    };

    adminOrganizationsService.getOrganization.mockResolvedValue({
      id: 'org-1',
      name: 'Acme Labs s.r.o.',
      ico: '12345678',
      sector: null,
      description: null,
      website: null,
      logoUrl: null,
      status: OrganizationStatus.ACTIVE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      owner: {
        id: 'owner-1',
        email: 'owner1@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      },
    });

    const result = await controller.getOrganization(actor, 'org-1');

    expect(adminOrganizationsService.getOrganization).toHaveBeenCalledWith(
      actor,
      'org-1',
    );
    expect(result.owner.email).toBe('owner1@example.com');
  });
});

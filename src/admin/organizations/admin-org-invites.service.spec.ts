jest.mock('../../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('./org-invitation.repository', () => ({
  OrgInvitationRepository: class OrgInvitationRepository {},
}));
jest.mock('../../organization/organization.repository', () => ({
  OrganizationRepository: class OrganizationRepository {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  InvitationStatus,
  UserRole,
  UserStatus,
} from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { OrganizationRepository } from '../../organization/organization.repository';
import { AdminOrgInvitesService } from './admin-org-invites.service';
import { OrgInvitationRepository } from './org-invitation.repository';

describe('AdminOrgInvitesService', () => {
  let service: AdminOrgInvitesService;
  let orgInvitationRepository: {
    findMany: jest.Mock;
  };
  let organizationRepository: {
    findUnique: jest.Mock;
  };

  const actorAdmin: AuthenticatedUserContext = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  };

  const actorStudent: AuthenticatedUserContext = {
    id: 'student-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  };

  beforeEach(() => {
    orgInvitationRepository = {
      findMany: jest.fn(),
    };

    organizationRepository = {
      findUnique: jest.fn(),
    };

    service = new AdminOrgInvitesService(
      orgInvitationRepository as unknown as OrgInvitationRepository,
      organizationRepository as unknown as OrganizationRepository,
    );
  });

  it('blocks non-admin users', async () => {
    await expect(service.listAll(actorStudent)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lists all organization invites ordered by createdAt desc', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const expiresAt = new Date('2026-01-08T00:00:00.000Z');

    orgInvitationRepository.findMany.mockResolvedValue([
      {
        id: 'invite-1',
        email: 'employee@example.com',
        token: 'secret-token',
        roleToAssign: UserRole.COMPANY_EMPLOYEE,
        status: InvitationStatus.PENDING,
        organizationId: 'org-1',
        revokedById: null,
        createdAt,
        updatedAt,
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
      },
    ]);

    const result = await service.listAll(actorAdmin);

    expect(orgInvitationRepository.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'desc' }],
    });
    expect(result).toEqual([
      {
        id: 'invite-1',
        email: 'employee@example.com',
        roleToAssign: UserRole.COMPANY_EMPLOYEE,
        status: InvitationStatus.PENDING,
        organizationId: 'org-1',
        revokedById: null,
        createdAt,
        updatedAt,
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
      },
    ]);
    expect(result[0]).not.toHaveProperty('token');
  });

  it('throws not found when organization does not exist', async () => {
    organizationRepository.findUnique.mockResolvedValue(null);

    await expect(
      service.listByOrganization(actorAdmin, 'org-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists invites filtered by organization id', async () => {
    organizationRepository.findUnique.mockResolvedValue({ id: 'org-1' });
    orgInvitationRepository.findMany.mockResolvedValue([
      {
        id: 'invite-2',
        email: 'employee2@example.com',
        token: 'secret-token-2',
        roleToAssign: UserRole.COMPANY_EMPLOYEE,
        status: InvitationStatus.PENDING,
        organizationId: 'org-1',
        revokedById: null,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        expiresAt: new Date('2026-01-09T00:00:00.000Z'),
        acceptedAt: null,
        revokedAt: null,
      },
    ]);

    const result = await service.listByOrganization(actorAdmin, 'org-1');

    expect(orgInvitationRepository.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: [{ createdAt: 'desc' }],
    });
    expect(result[0]).not.toHaveProperty('token');
  });
});

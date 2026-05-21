jest.mock('../../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('../../organization/organization.repository', () => ({
  OrganizationRepository: class OrganizationRepository {},
}));
jest.mock('../../organization/organization-invitation.repository', () => ({
  OrganizationInviteRepository: class OrganizationInviteRepository {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  InvitationStatus,
  UserRole,
  UserStatus,
} from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { OrganizationInviteRepository } from '../../organization/organization-invitation.repository';
import { OrganizationRepository } from '../../organization/organization.repository';
import { AdminOrgInvitesService } from './admin-org-invites.service';

describe('AdminOrgInvitesService', () => {
  let service: AdminOrgInvitesService;
  let organizationInviteRepository: {
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
    organizationId: null,
  };

  const actorStudent: AuthenticatedUserContext = {
    id: 'student-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    organizationId: null,
  };

  beforeEach(() => {
    organizationInviteRepository = {
      findMany: jest.fn(),
    };

    organizationRepository = {
      findUnique: jest.fn(),
    };

    service = new AdminOrgInvitesService(
      organizationInviteRepository as unknown as OrganizationInviteRepository,
      organizationRepository as unknown as OrganizationRepository,
    );
  });

  it('blocks non-admin users', async () => {
    await expect(service.listAll(actorStudent)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lists all organization invites ordered by createdAt desc', async () => {
    const createdAt = new Date('2030-01-01T00:00:00.000Z');
    const expiresAt = new Date('2030-01-08T00:00:00.000Z');

    organizationInviteRepository.findMany.mockResolvedValue([
      {
        id: 'invite-1',
        email: 'employee@example.com',
        roleToAssign: UserRole.COMPANY_EMPLOYEE,
        status: InvitationStatus.PENDING,
        createdAt,
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
      },
    ]);

    const result = await service.listAll(actorAdmin);

    expect(organizationInviteRepository.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'desc' }],
    });
    expect(result).toEqual([
      {
        id: 'invite-1',
        email: 'employee@example.com',
        roleToAssign: UserRole.COMPANY_EMPLOYEE,
        status: InvitationStatus.PENDING,
        createdAt,
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
      },
    ]);
  });

  it('throws not found when organization does not exist', async () => {
    organizationRepository.findUnique.mockResolvedValue(null);

    await expect(
      service.listByOrganization(actorAdmin, 'org-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns invites for organization id', async () => {
    const invite = {
      id: 'invite-1',
      email: 'employee@example.com',
      roleToAssign: UserRole.COMPANY_EMPLOYEE,
      status: InvitationStatus.PENDING,
      createdAt: new Date('2030-01-02T00:00:00.000Z'),
      expiresAt: new Date('2030-01-09T00:00:00.000Z'),
      acceptedAt: null,
      revokedAt: null,
    };
    organizationRepository.findUnique.mockResolvedValue({ id: 'org-1' });
    organizationInviteRepository.findMany.mockResolvedValue([invite]);

    const result = await service.listByOrganization(actorAdmin, 'org-1');

    expect(organizationRepository.findUnique).toHaveBeenCalledWith({
      id: 'org-1',
    });
    expect(organizationInviteRepository.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: [{ createdAt: 'desc' }],
    });
    expect(result).toEqual([invite]);
  });
});

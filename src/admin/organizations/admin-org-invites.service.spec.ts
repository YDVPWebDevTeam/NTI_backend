jest.mock('../../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('../../organization/organization.repository', () => ({
  OrganizationRepository: class OrganizationRepository {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  OrganizationStatus,
  UserRole,
  UserStatus,
} from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { OrganizationRepository } from '../../organization/organization.repository';
import { AdminOrgInvitesService } from './admin-org-invites.service';

describe('AdminOrgInvitesService', () => {
  let service: AdminOrgInvitesService;
  let organizationRepository: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
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
    organizationRepository = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    };

    service = new AdminOrgInvitesService(
      organizationRepository as unknown as OrganizationRepository,
    );
  });

  it('blocks non-admin users', async () => {
    await expect(service.listAll(actorStudent)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lists all pending organization applications ordered by createdAt desc', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');

    organizationRepository.findMany.mockResolvedValue([
      {
        id: 'org-1',
        name: 'Acme Labs s.r.o.',
        ico: '12345678',
        status: OrganizationStatus.PENDING,
        website: null,
        sector: null,
        description: null,
        logoUrl: null,
        createdAt,
        updatedAt,
      },
    ]);

    const result = await service.listAll(actorAdmin);

    expect(organizationRepository.findMany).toHaveBeenCalledWith({
      where: { status: OrganizationStatus.PENDING },
      orderBy: [{ createdAt: 'desc' }],
    });
    expect(result).toEqual([
      {
        id: 'org-1',
        name: 'Acme Labs s.r.o.',
        ico: '12345678',
        status: OrganizationStatus.PENDING,
        website: null,
        sector: null,
        description: null,
        logoUrl: null,
        createdAt,
        updatedAt,
      },
    ]);
  });

  it('throws not found when organization does not exist', async () => {
    organizationRepository.findUnique.mockResolvedValue(null);

    await expect(
      service.listByOrganization(actorAdmin, 'org-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns application for organization id', async () => {
    const application = {
      id: 'org-1',
      name: 'Acme Labs s.r.o.',
      ico: '12345678',
      status: OrganizationStatus.PENDING,
      website: null,
      sector: null,
      description: null,
      logoUrl: null,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    organizationRepository.findUnique.mockResolvedValue(application);

    const result = await service.listByOrganization(actorAdmin, 'org-1');

    expect(organizationRepository.findUnique).toHaveBeenCalledWith({
      id: 'org-1',
    });
    expect(result).toEqual([application]);
  });

  it('returns even non-pending application for organization id', async () => {
    const application = {
      id: 'org-1',
      name: 'Acme Labs s.r.o.',
      ico: '12345678',
      status: OrganizationStatus.ACTIVE,
      website: null,
      sector: null,
      description: null,
      logoUrl: null,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    organizationRepository.findUnique.mockResolvedValue(application);

    const result = await service.listByOrganization(actorAdmin, 'org-1');

    expect(result).toEqual([application]);
  });
});

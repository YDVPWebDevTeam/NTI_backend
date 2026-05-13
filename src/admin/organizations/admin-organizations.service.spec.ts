jest.mock('../../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('../../organization/organization.repository', () => ({
  OrganizationRepository: class OrganizationRepository {},
}));
jest.mock('../../user/user.repository', () => ({
  UserRepository: class UserRepository {},
}));
jest.mock('../../infrastructure/queue/queue.service', () => ({
  QueueService: class QueueService {},
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationStatus,
  UserRole,
  UserStatus,
} from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EMAIL_JOBS } from '../../infrastructure/queue/queue.types';
import { OrganizationRepository } from '../../organization/organization.repository';
import { UserRepository } from '../../user/user.repository';
import { AdminOrganizationsService } from './admin-organizations.service';
import { MANAGEABLE_ORG_STATUSES } from './dto/update-org-status.dto';
import type { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto';

describe('AdminOrganizationsService', () => {
  let service: AdminOrganizationsService;
  let organizationRepository: {
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    findManyForAdminPaginated: jest.Mock;
  };
  let userRepository: {
    findOrganizationOwner: jest.Mock;
  };
  let queueService: {
    addEmail: jest.Mock;
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

  const pendingOrganization = {
    id: 'org-1',
    name: 'Acme Labs s.r.o.',
    ico: '12345678',
    sector: null,
    description: null,
    website: null,
    logoUrl: null,
    status: OrganizationStatus.PENDING,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const defaultQuery: ListOrganizationsQueryDto = {
    page: 1,
    limit: 20,
    sort: 'createdAt',
    order: 'desc',
  };

  beforeEach(() => {
    organizationRepository = {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findManyForAdminPaginated: jest.fn(),
    };

    userRepository = {
      findOrganizationOwner: jest.fn(),
    };

    queueService = {
      addEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new AdminOrganizationsService(
      organizationRepository as unknown as OrganizationRepository,
      userRepository as unknown as UserRepository,
      queueService as unknown as QueueService,
    );
  });

  describe('listOrganizations', () => {
    it('returns paginated organization list for admins', async () => {
      organizationRepository.findManyForAdminPaginated.mockResolvedValue({
        data: [{ ...pendingOrganization, membersCount: 3 }],
        total: 1,
      });

      const result = await service.listOrganizations(actorAdmin, defaultQuery);

      expect(
        organizationRepository.findManyForAdminPaginated,
      ).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: pendingOrganization.id,
        name: pendingOrganization.name,
        ico: pendingOrganization.ico,
        status: pendingOrganization.status,
        membersCount: 3,
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

    it('throws forbidden when non-admin requests organizations list', async () => {
      await expect(
        service.listOrganizations(actorStudent, defaultQuery),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        organizationRepository.findManyForAdminPaginated,
      ).not.toHaveBeenCalled();
    });

    it('passes q search as OR filter on name and ico', async () => {
      organizationRepository.findManyForAdminPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.listOrganizations(actorAdmin, {
        ...defaultQuery,
        q: 'acme',
      });

      expect(
        organizationRepository.findManyForAdminPaginated,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'acme', mode: 'insensitive' } },
              { ico: { contains: 'acme', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('passes status and sector as exact/contains filters', async () => {
      organizationRepository.findManyForAdminPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.listOrganizations(actorAdmin, {
        ...defaultQuery,
        status: OrganizationStatus.ACTIVE,
        sector: 'IT',
      });

      expect(
        organizationRepository.findManyForAdminPaginated,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: OrganizationStatus.ACTIVE,
            sector: { contains: 'IT', mode: 'insensitive' },
          },
        }),
      );
    });

    it('passes sort and order to repository as orderBy', async () => {
      organizationRepository.findManyForAdminPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.listOrganizations(actorAdmin, {
        ...defaultQuery,
        sort: 'name',
        order: 'asc',
      });

      expect(
        organizationRepository.findManyForAdminPaginated,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        }),
      );
    });
  });

  it('throws when actor is not an administrator', async () => {
    await expect(
      service.updateStatus(actorStudent, 'org-1', {
        status: MANAGEABLE_ORG_STATUSES.ACTIVE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when organization is not found', async () => {
    organizationRepository.updateMany.mockResolvedValue({ count: 0 });
    organizationRepository.findUnique.mockResolvedValue(null);

    await expect(
      service.updateStatus(actorAdmin, 'missing-org', {
        status: MANAGEABLE_ORG_STATUSES.ACTIVE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when organization is already processed', async () => {
    organizationRepository.updateMany.mockResolvedValue({ count: 0 });
    organizationRepository.findUnique.mockResolvedValue({
      ...pendingOrganization,
      status: OrganizationStatus.ACTIVE,
    });

    await expect(
      service.updateStatus(actorAdmin, 'org-1', {
        status: MANAGEABLE_ORG_STATUSES.ACTIVE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates to ACTIVE and queues ORG_APPROVED', async () => {
    organizationRepository.updateMany.mockResolvedValue({ count: 1 });
    organizationRepository.findUnique.mockResolvedValue({
      ...pendingOrganization,
      status: OrganizationStatus.ACTIVE,
    });
    userRepository.findOrganizationOwner.mockResolvedValue({
      id: 'owner-1',
      email: 'owner1@example.com',
    });

    const result = await service.updateStatus(actorAdmin, 'org-1', {
      status: MANAGEABLE_ORG_STATUSES.ACTIVE,
    });

    expect(organizationRepository.updateMany).toHaveBeenCalledWith(
      { id: 'org-1', status: OrganizationStatus.PENDING },
      { status: OrganizationStatus.ACTIVE },
    );
    expect(queueService.addEmail).toHaveBeenCalledWith(
      EMAIL_JOBS.ORG_APPROVED,
      {
        organizationId: 'org-1',
        organizationName: pendingOrganization.name,
        ownerEmails: ['owner1@example.com'],
      },
    );
    expect(result.status).toBe(OrganizationStatus.ACTIVE);
  });

  it('updates to REJECTED and queues ORG_REJECTED with reason', async () => {
    organizationRepository.updateMany.mockResolvedValue({ count: 1 });
    organizationRepository.findUnique.mockResolvedValue({
      ...pendingOrganization,
      status: OrganizationStatus.REJECTED,
    });
    userRepository.findOrganizationOwner.mockResolvedValue({
      id: 'owner-1',
      email: 'owner1@example.com',
    });

    const result = await service.updateStatus(actorAdmin, 'org-1', {
      status: MANAGEABLE_ORG_STATUSES.REJECTED,
      rejectionReason: 'Missing legal documents',
    });

    expect(queueService.addEmail).toHaveBeenCalledWith(
      EMAIL_JOBS.ORG_REJECTED,
      {
        organizationId: 'org-1',
        organizationName: pendingOrganization.name,
        ownerEmails: ['owner1@example.com'],
        rejectionReason: 'Missing legal documents',
      },
    );
    expect(result.status).toBe(OrganizationStatus.REJECTED);
  });

  it('does not queue owner notification when no owners are found', async () => {
    organizationRepository.updateMany.mockResolvedValue({ count: 1 });
    organizationRepository.findUnique.mockResolvedValue({
      ...pendingOrganization,
      status: OrganizationStatus.ACTIVE,
    });
    userRepository.findOrganizationOwner.mockResolvedValue(null);

    await service.updateStatus(actorAdmin, 'org-1', {
      status: MANAGEABLE_ORG_STATUSES.ACTIVE,
    });

    expect(queueService.addEmail).not.toHaveBeenCalled();
  });

  describe('getOrganization', () => {
    it('returns organization with owner summary', async () => {
      organizationRepository.findUnique.mockResolvedValue({
        ...pendingOrganization,
        status: OrganizationStatus.ACTIVE,
      });
      userRepository.findOrganizationOwner.mockResolvedValue({
        id: 'owner-1',
        email: 'owner1@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      const result = await service.getOrganization(actorAdmin, 'org-1');

      expect(result.id).toBe('org-1');
      expect(result.owner.email).toBe('owner1@example.com');
    });

    it('throws when organization is missing', async () => {
      organizationRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrganization(actorAdmin, 'missing-org'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when owner is missing', async () => {
      organizationRepository.findUnique.mockResolvedValue(pendingOrganization);
      userRepository.findOrganizationOwner.mockResolvedValue(null);

      await expect(
        service.getOrganization(actorAdmin, 'org-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

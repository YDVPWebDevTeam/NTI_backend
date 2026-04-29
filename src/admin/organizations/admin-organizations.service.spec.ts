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

describe('AdminOrganizationsService', () => {
  let service: AdminOrganizationsService;
  let organizationRepository: {
    findUnique: jest.Mock;
    updateMany: jest.Mock;
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

  beforeEach(() => {
    organizationRepository = {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
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
});

jest.mock('generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('./organization.repository', () => ({
  OrganizationRepository: class OrganizationRepository {},
}));
jest.mock('../user/user.repository', () => ({
  UserRepository: class UserRepository {},
}));
jest.mock('../infrastructure/queue/queue.service', () => ({
  QueueService: class QueueService {},
}));
jest.mock('./organization-invitation.repository', () => ({
  OrganizationInviteRepository: class OrganizationInviteRepository {},
}));
jest.mock('../infrastructure/hashing/hashing.service', () => ({
  HashingService: class HashingService {},
}));
jest.mock('../infrastructure/config/config.service', () => ({
  ConfigService: class ConfigService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  OrganizationStatus,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { OrganizationService } from './organization.service';
import type { OrganizationRepository } from './organization.repository';

describe('OrganizationService (profile)', () => {
  let service: OrganizationService;
  let organizationRepository: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };

  const ownerContext: AuthenticatedUserContext = {
    id: 'owner-1',
    email: 'owner@example.com',
    role: UserRole.COMPANY_OWNER,
    status: UserStatus.ACTIVE,
    organizationId: 'org-1',
  };

  const existingOrganization = {
    id: 'org-1',
    name: 'Acme Labs s.r.o.',
    ico: '12345678',
    sector: null,
    description: null,
    website: null,
    logoUrl: null,
    status: OrganizationStatus.PENDING,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    organizationRepository = {
      findUnique: jest.fn(),
      update: jest.fn(),
    };

    service = new OrganizationService(
      organizationRepository as unknown as OrganizationRepository,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('getMyOrganization', () => {
    it('throws 404 when user has no organizationId', async () => {
      await expect(
        service.getMyOrganization({ ...ownerContext, organizationId: null }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws 404 when organization does not exist', async () => {
      organizationRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.getMyOrganization(ownerContext),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns organization when found', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      const result = await service.getMyOrganization(ownerContext);
      expect(result.id).toBe(existingOrganization.id);
    });
  });

  describe('updateMyOrganization', () => {
    it('throws 404 when user has no organizationId', async () => {
      await expect(
        service.updateMyOrganization({ name: 'X' } as any, {
          ...ownerContext,
          organizationId: null,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws 404 when organization does not exist', async () => {
      organizationRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMyOrganization({ name: 'New Name' } as any, ownerContext),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws 400 when body is empty', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      await expect(
        service.updateMyOrganization({} as any, ownerContext),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 400 when ico is changed after org is processed', async () => {
      organizationRepository.findUnique.mockResolvedValue({
        ...existingOrganization,
        status: OrganizationStatus.ACTIVE,
      });

      await expect(
        service.updateMyOrganization({ ico: '87654321' } as any, ownerContext),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows patching nullable fields to null', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);
      organizationRepository.update.mockResolvedValue({
        ...existingOrganization,
        sector: null,
        website: null,
      });

      const result = await service.updateMyOrganization(
        { sector: null, website: null } as any,
        ownerContext,
      );

      expect(organizationRepository.update).toHaveBeenCalledWith(
        { id: 'org-1' },
        { sector: null, website: null },
      );
      expect(result.id).toBe('org-1');
    });
  });
});

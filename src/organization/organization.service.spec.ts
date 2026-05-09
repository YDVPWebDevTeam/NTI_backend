jest.mock('../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });
jest.mock('generated/prisma/client', () => ({}), { virtual: true });

jest.mock(
  'generated/prisma/enums',
  () => ({
    InvitationStatus: {
      PENDING: 'PENDING',
      ACCEPTED: 'ACCEPTED',
      EXPIRED: 'EXPIRED',
      REVOKED: 'REVOKED',
    },
    OrganizationStatus: {
      PENDING: 'PENDING',
      ACTIVE: 'ACTIVE',
      REJECTED: 'REJECTED',
      SUSPENDED: 'SUSPENDED',
    },
    UserRole: {
      STUDENT: 'STUDENT',
      COMPANY_OWNER: 'COMPANY_OWNER',
      COMPANY_EMPLOYEE: 'COMPANY_EMPLOYEE',
    },
    UserStatus: {
      ACTIVE: 'ACTIVE',
      PENDING: 'PENDING',
      SUSPENDED: 'SUSPENDED',
    },
  }),
  { virtual: true },
);

jest.mock('./organization.repository', () => ({
  OrganizationRepository: class OrganizationRepository {},
}));

jest.mock(
  'src/user/user.repository',
  () => ({
    UserRepository: class UserRepository {},
  }),
  { virtual: true },
);

jest.mock(
  'src/infrastructure/queue',
  () => ({
    QueueService: class QueueService {},
    EMAIL_JOBS: {
      ORG_INVITE: 'org-invite',
      ORG_PENDING_REVIEW: 'org-pending-review',
    },
  }),
  { virtual: true },
);

jest.mock('./organization-invitation.repository', () => ({
  OrganizationInviteRepository: class OrganizationInviteRepository {},
}));

jest.mock(
  'src/infrastructure/hashing',
  () => ({
    HashingService: class HashingService {},
  }),
  { virtual: true },
);

jest.mock(
  'src/infrastructure/config',
  () => ({
    ConfigService: class ConfigService {},
  }),
  { virtual: true },
);

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvitationStatus,
  OrganizationStatus,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import type { AuthenticatedUserContext } from 'src/common/types/auth-user-context.type';
import { ConfigService } from 'src/infrastructure/config';
import { HashingService } from 'src/infrastructure/hashing';
import { QueueService } from 'src/infrastructure/queue';
import { UserRepository } from 'src/user/user.repository';
import type { UpdateOrganizationProfileDto } from './dto/update-organization-profile.dto';
import type { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { OrganizationInviteRepository } from './organization-invitation.repository';
import { OrganizationRepository } from './organization.repository';
import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  let service: OrganizationService;

  let organizationRepository: {
    findUnique: jest.Mock;
    transaction: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  let userRepository: {
    findByEmail: jest.Mock;
    findAdmins: jest.Mock;
    updateOrganizationIfNotExists: jest.Mock;
    findOrganizationMembers: jest.Mock;
    findOrganizationMember: jest.Mock;
    findActiveOrganizationMember: jest.Mock;
    updateUserRole: jest.Mock;
    update: jest.Mock;
    removeOrganizationMember: jest.Mock;
  };

  let queueService: {
    addEmail: jest.Mock;
  };

  let organizationInviteRepository: {
    findActivePendingByEmailAndOrganization: jest.Mock;
    findByIdAndOrganization: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  let hashingService: {
    generateHexToken: jest.Mock;
  };

  let configService: {
    tokenByteLength: number;
    organizationInvitationExpirationDays: number;
  };

  const owner: AuthenticatedUserContext = {
    id: 'owner-1',
    email: 'owner@example.com',
    role: UserRole.COMPANY_OWNER,
    status: UserStatus.ACTIVE,
    organizationId: 'org-1',
  };

  const employee: AuthenticatedUserContext = {
    id: 'employee-1',
    email: 'employee@example.com',
    role: UserRole.COMPANY_EMPLOYEE,
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

  const updateDto = (
    data: Partial<UpdateOrganizationProfileDto>,
  ): UpdateOrganizationProfileDto => data as UpdateOrganizationProfileDto;

  const runTransaction = (callback: (tx: object) => Promise<unknown>) =>
    callback({});

  beforeEach(() => {
    organizationRepository = {
      findUnique: jest.fn(),
      transaction: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    userRepository = {
      findByEmail: jest.fn(),
      findAdmins: jest.fn(),
      updateOrganizationIfNotExists: jest.fn(),
      findOrganizationMembers: jest.fn(),
      findOrganizationMember: jest.fn(),
      findActiveOrganizationMember: jest.fn(),
      updateUserRole: jest.fn(),
      update: jest.fn(),
      removeOrganizationMember: jest.fn(),
    };

    queueService = {
      addEmail: jest.fn(),
    };

    organizationInviteRepository = {
      findActivePendingByEmailAndOrganization: jest.fn(),
      findByIdAndOrganization: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    hashingService = {
      generateHexToken: jest.fn(),
    };

    configService = {
      tokenByteLength: 32,
      organizationInvitationExpirationDays: 7,
    };

    service = new OrganizationService(
      organizationRepository as unknown as OrganizationRepository,
      userRepository as unknown as UserRepository,
      queueService as unknown as QueueService,
      organizationInviteRepository as unknown as OrganizationInviteRepository,
      hashingService as unknown as HashingService,
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getMyOrganization', () => {
    it('throws 404 when user has no organizationId', async () => {
      await expect(
        service.getMyOrganization({ ...owner, organizationId: null }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws 404 when organization does not exist', async () => {
      organizationRepository.findUnique.mockResolvedValue(null);

      await expect(service.getMyOrganization(owner)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns organization when found', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      const result = await service.getMyOrganization(owner);

      expect(result.id).toBe(existingOrganization.id);
    });
  });

  describe('updateMyOrganization', () => {
    it('throws 404 when user has no organizationId', async () => {
      await expect(
        service.updateMyOrganization(updateDto({ name: 'X' }), {
          ...owner,
          organizationId: null,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws 404 when organization does not exist', async () => {
      organizationRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMyOrganization(updateDto({ name: 'New Name' }), owner),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws 400 when body is empty', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      await expect(
        service.updateMyOrganization(updateDto({}), owner),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 400 when ico is changed after org is processed', async () => {
      organizationRepository.findUnique.mockResolvedValue({
        ...existingOrganization,
        status: OrganizationStatus.ACTIVE,
      });

      await expect(
        service.updateMyOrganization(updateDto({ ico: '87654321' }), owner),
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
        updateDto({ sector: null, website: null }),
        owner,
      );

      expect(organizationRepository.update).toHaveBeenCalledWith(
        { id: 'org-1' },
        { sector: null, website: null },
      );
      expect(result.id).toBe('org-1');
    });
  });

  describe('organization invites', () => {
    it('lists invitations with computed EXPIRED status and pagination meta', async () => {
      const now = new Date('2026-04-29T10:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      organizationInviteRepository.findMany.mockResolvedValue([
        {
          id: 'invite-1',
          email: 'expired@example.com',
          token: 'token-1',
          status: InvitationStatus.PENDING,
          organizationId: 'org-1',
          roleToAssign: UserRole.COMPANY_EMPLOYEE,
          revokedById: null,
          createdAt: new Date('2026-04-20T10:00:00.000Z'),
          updatedAt: new Date('2026-04-20T10:00:00.000Z'),
          expiresAt: new Date('2026-04-25T10:00:00.000Z'),
          acceptedAt: null,
          revokedAt: null,
        },
      ]);

      organizationInviteRepository.count.mockResolvedValue(1);

      const result = await service.listInvites(
        'org-1',
        { page: 1, limit: 20, sort: 'createdAt', order: 'desc' },
        owner,
      );

      expect(organizationInviteRepository.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: 0,
        take: 20,
      });

      expect(result).toEqual({
        data: [
          expect.objectContaining({
            id: 'invite-1',
            email: 'expired@example.com',
            status: InvitationStatus.EXPIRED,
          }),
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('blocks access to invitations from another organization', async () => {
      organizationRepository.findUnique.mockResolvedValue({
        ...existingOrganization,
        id: 'org-2',
      });

      await expect(
        service.listInvites(
          'org-2',
          { page: 1, limit: 20, sort: 'createdAt', order: 'desc' },
          owner,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('revokes a pending unexpired invite', async () => {
      const now = new Date('2026-04-29T10:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      organizationInviteRepository.findByIdAndOrganization.mockResolvedValue({
        id: 'invite-1',
        email: 'employee@example.com',
        token: 'token-1',
        status: InvitationStatus.PENDING,
        organizationId: 'org-1',
        roleToAssign: UserRole.COMPANY_EMPLOYEE,
        revokedById: null,
        createdAt: new Date('2026-04-28T10:00:00.000Z'),
        updatedAt: new Date('2026-04-28T10:00:00.000Z'),
        expiresAt: new Date('2026-05-02T10:00:00.000Z'),
        acceptedAt: null,
        revokedAt: null,
      });

      organizationInviteRepository.update.mockResolvedValue({
        id: 'invite-1',
        revokedAt: now,
      });

      const result = await service.revokeInvite('org-1', 'invite-1', owner);

      expect(organizationInviteRepository.update).toHaveBeenCalledWith(
        { id: 'invite-1' },
        {
          status: InvitationStatus.REVOKED,
          revokedAt: now,
          revokedById: owner.id,
        },
      );

      expect(result).toEqual({
        id: 'invite-1',
        status: 'REVOKED',
        revokedAt: now,
      });
    });

    it('rejects resend for an expired invite', async () => {
      const now = new Date('2026-04-29T10:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      organizationInviteRepository.findByIdAndOrganization.mockResolvedValue({
        id: 'invite-1',
        email: 'employee@example.com',
        token: 'old-token',
        status: InvitationStatus.PENDING,
        organizationId: 'org-1',
        roleToAssign: UserRole.COMPANY_EMPLOYEE,
        revokedById: null,
        createdAt: new Date('2026-04-20T10:00:00.000Z'),
        updatedAt: new Date('2026-04-20T10:00:00.000Z'),
        expiresAt: new Date('2026-04-25T10:00:00.000Z'),
        acceptedAt: null,
        revokedAt: null,
      });

      await expect(
        service.resendInvite('org-1', 'invite-1', owner),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('organization members', () => {
    it('allows owner to list organization members', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      userRepository.findOrganizationMembers.mockResolvedValue([
        owner,
        employee,
      ]);

      const result = await service.listMembers('org-1', owner);

      expect(userRepository.findOrganizationMembers).toHaveBeenCalledWith(
        'org-1',
      );
      expect(result).toHaveLength(2);
    });

    it('allows employee to list organization members from same organization', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      userRepository.findOrganizationMembers.mockResolvedValue([
        owner,
        employee,
      ]);

      const result = await service.listMembers('org-1', employee);

      expect(userRepository.findOrganizationMembers).toHaveBeenCalledWith(
        'org-1',
      );
      expect(result).toHaveLength(2);
    });

    it('blocks cross-org member listing', async () => {
      organizationRepository.findUnique.mockResolvedValue({
        ...existingOrganization,
        id: 'org-2',
      });

      await expect(service.listMembers('org-2', owner)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('allows owner to update employee role to employee', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      userRepository.findOrganizationMember.mockResolvedValue(employee);

      userRepository.updateUserRole.mockResolvedValue({
        ...employee,
        role: UserRole.COMPANY_EMPLOYEE,
      });

      const result = await service.updateMemberRole(
        'org-1',
        'employee-1',
        { role: UserRole.COMPANY_EMPLOYEE },
        owner,
      );

      expect(userRepository.updateUserRole).toHaveBeenCalledWith(
        'employee-1',
        UserRole.COMPANY_EMPLOYEE,
      );

      expect(result.role).toBe(UserRole.COMPANY_EMPLOYEE);
    });

    it('blocks employee from updating member role', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      await expect(
        service.updateMemberRole(
          'org-1',
          'owner-1',
          { role: UserRole.COMPANY_EMPLOYEE },
          employee,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('blocks setting COMPANY_OWNER through role update endpoint', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      userRepository.findOrganizationMember.mockResolvedValue(employee);

      const invalidDto = {
        role: UserRole.COMPANY_OWNER,
      } as unknown as UpdateOrganizationMemberRoleDto;

      await expect(
        service.updateMemberRole('org-1', 'employee-1', invalidDto, owner),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('blocks direct role change of current owner', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      userRepository.findOrganizationMember.mockResolvedValue({
        ...owner,
        role: UserRole.COMPANY_OWNER,
      });

      await expect(
        service.updateMemberRole(
          'org-1',
          'owner-1',
          { role: UserRole.COMPANY_EMPLOYEE },
          owner,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 404 when member for role update is not found', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      userRepository.findOrganizationMember.mockResolvedValue(null);

      await expect(
        service.updateMemberRole(
          'org-1',
          'missing-user',
          { role: UserRole.COMPANY_EMPLOYEE },
          owner,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes non-owner member from organization', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      userRepository.findOrganizationMember.mockResolvedValue(employee);

      userRepository.removeOrganizationMember.mockResolvedValue({
        ...employee,
        organizationId: null,
        role: UserRole.STUDENT,
      });

      const result = await service.removeMember('org-1', 'employee-1', owner);

      expect(userRepository.removeOrganizationMember).toHaveBeenCalledWith(
        'employee-1',
      );

      expect(result.organizationId).toBeNull();
      expect(result.role).toBe(UserRole.STUDENT);
    });

    it('blocks employee from removing member', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      await expect(
        service.removeMember('org-1', 'owner-1', employee),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('blocks removing current owner', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      userRepository.findOrganizationMember.mockResolvedValue({
        ...owner,
        role: UserRole.COMPANY_OWNER,
      });

      await expect(
        service.removeMember('org-1', 'owner-1', owner),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 404 when removed member is not found', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      userRepository.findOrganizationMember.mockResolvedValue(null);

      await expect(
        service.removeMember('org-1', 'missing-user', owner),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('transfers ownership transactionally', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);
      organizationRepository.transaction.mockImplementation(runTransaction);

      userRepository.findOrganizationMember
        .mockResolvedValueOnce({
          ...owner,
          role: UserRole.COMPANY_OWNER,
          status: UserStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          ...employee,
          role: UserRole.COMPANY_EMPLOYEE,
          status: UserStatus.ACTIVE,
        });

      userRepository.updateUserRole
        .mockResolvedValueOnce({
          ...owner,
          role: UserRole.COMPANY_EMPLOYEE,
        })
        .mockResolvedValueOnce({
          ...employee,
          role: UserRole.COMPANY_OWNER,
        });

      const result = await service.transferOwner(
        'org-1',
        { newOwnerUserId: 'employee-1' },
        owner,
      );

      expect(organizationRepository.transaction).toHaveBeenCalled();

      expect(userRepository.updateUserRole).toHaveBeenNthCalledWith(
        1,
        'owner-1',
        UserRole.COMPANY_EMPLOYEE,
        expect.anything(),
      );

      expect(userRepository.updateUserRole).toHaveBeenNthCalledWith(
        2,
        'employee-1',
        UserRole.COMPANY_OWNER,
        expect.anything(),
      );

      expect(result.role).toBe(UserRole.COMPANY_OWNER);
    });

    it('blocks ownership transfer to current owner', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      await expect(
        service.transferOwner('org-1', { newOwnerUserId: 'owner-1' }, owner),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('blocks employee from transferring ownership', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);

      await expect(
        service.transferOwner(
          'org-1',
          { newOwnerUserId: 'employee-1' },
          employee,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws 404 when new owner is not organization member', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);
      organizationRepository.transaction.mockImplementation(runTransaction);

      userRepository.findOrganizationMember
        .mockResolvedValueOnce({
          ...owner,
          role: UserRole.COMPANY_OWNER,
          status: UserStatus.ACTIVE,
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.transferOwner(
          'org-1',
          { newOwnerUserId: 'missing-user' },
          owner,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('blocks ownership transfer to suspended user', async () => {
      organizationRepository.findUnique.mockResolvedValue(existingOrganization);
      organizationRepository.transaction.mockImplementation(runTransaction);

      userRepository.findOrganizationMember
        .mockResolvedValueOnce({
          ...owner,
          role: UserRole.COMPANY_OWNER,
          status: UserStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          ...employee,
          status: UserStatus.SUSPENDED,
        });

      await expect(
        service.transferOwner('org-1', { newOwnerUserId: 'employee-1' }, owner),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

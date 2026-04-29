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
    UserRole: {
      COMPANY_OWNER: 'COMPANY_OWNER',
      COMPANY_EMPLOYEE: 'COMPANY_EMPLOYEE',
    },
    UserStatus: {
      ACTIVE: 'ACTIVE',
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

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { InvitationStatus, UserRole, UserStatus } from 'generated/prisma/enums';
import type { AuthenticatedUserContext } from 'src/common/types/auth-user-context.type';
import { ConfigService } from 'src/infrastructure/config';
import { HashingService } from 'src/infrastructure/hashing';
import { QueueService } from 'src/infrastructure/queue';
import { UserRepository } from 'src/user/user.repository';
import { OrganizationInviteRepository } from './organization-invitation.repository';
import { OrganizationRepository } from './organization.repository';
import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let organizationRepository: {
    findUnique: jest.Mock;
    transaction: jest.Mock;
    create: jest.Mock;
  };
  let userRepository: {
    findByEmail: jest.Mock;
    findAdmins: jest.Mock;
    updateOrganizationIfNotExists: jest.Mock;
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

  beforeEach(() => {
    organizationRepository = {
      findUnique: jest.fn(),
      transaction: jest.fn(),
      create: jest.fn(),
    };

    userRepository = {
      findByEmail: jest.fn(),
      findAdmins: jest.fn(),
      updateOrganizationIfNotExists: jest.fn(),
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

  it('lists invitations with computed EXPIRED status and pagination meta', async () => {
    const now = new Date('2026-04-29T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    organizationRepository.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'NTI',
    });
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
      { page: 1, limit: 20, sort: 'createdAt:desc' },
      owner,
    );

    expect(organizationInviteRepository.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: [{ createdAt: 'desc' }],
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
      id: 'org-2',
      name: 'Other Org',
    });

    await expect(
      service.listInvites(
        'org-2',
        { page: 1, limit: 20, sort: 'createdAt:desc' },
        owner,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revokes a pending unexpired invite', async () => {
    const now = new Date('2026-04-29T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    organizationRepository.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'NTI',
    });
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

    organizationRepository.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'NTI',
    });
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

  it('resends a pending unexpired invite with a new token and expiry', async () => {
    const now = new Date('2026-04-29T10:00:00.000Z');
    const newExpiresAt = new Date('2026-05-06T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    organizationRepository.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'NTI',
    });
    organizationInviteRepository.findByIdAndOrganization.mockResolvedValue({
      id: 'invite-1',
      email: 'employee@example.com',
      token: 'old-token',
      status: InvitationStatus.PENDING,
      organizationId: 'org-1',
      roleToAssign: UserRole.COMPANY_EMPLOYEE,
      revokedById: null,
      createdAt: new Date('2026-04-28T10:00:00.000Z'),
      updatedAt: new Date('2026-04-28T10:00:00.000Z'),
      expiresAt: new Date('2026-05-01T10:00:00.000Z'),
      acceptedAt: null,
      revokedAt: null,
    });
    hashingService.generateHexToken.mockReturnValue('new-token');
    organizationInviteRepository.update.mockResolvedValue({
      id: 'invite-1',
      email: 'employee@example.com',
      expiresAt: newExpiresAt,
    });

    const result = await service.resendInvite('org-1', 'invite-1', owner);

    expect(hashingService.generateHexToken).toHaveBeenCalledWith(32);
    expect(organizationInviteRepository.update).toHaveBeenCalledWith(
      { id: 'invite-1' },
      {
        token: 'new-token',
        status: InvitationStatus.PENDING,
        expiresAt: newExpiresAt,
      },
    );
    expect(queueService.addEmail).toHaveBeenCalledWith('org-invite', {
      email: 'employee@example.com',
      token: 'new-token',
      organizationName: 'NTI',
    });
    expect(result).toEqual({
      id: 'invite-1',
      email: 'employee@example.com',
      status: 'PENDING',
      expiresAt: newExpiresAt,
    });
  });
});

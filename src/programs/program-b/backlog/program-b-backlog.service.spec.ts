jest.mock('./program-b-backlog.repository', () => ({
  ProgramBBacklogRepository: class ProgramBBacklogRepository {},
}));

jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: {
      TransactionIsolationLevel: {
        Serializable: 'Serializable',
      },
    },
  }),
  { virtual: true },
);
jest.mock('@prisma/client', () => ({}), { virtual: true });
jest.mock(
  'generated/prisma/enums',
  () => ({
    BacklogItemStatus: {
      DRAFT: 'DRAFT',
      PUBLISHED: 'PUBLISHED',
      ARCHIVED: 'ARCHIVED',
    },
    OrganizationStatus: {
      PENDING: 'PENDING',
      ACTIVE: 'ACTIVE',
      REJECTED: 'REJECTED',
      SUSPENDED: 'SUSPENDED',
    },
    UserRole: {
      COMPANY_OWNER: 'COMPANY_OWNER',
      COMPANY_EMPLOYEE: 'COMPANY_EMPLOYEE',
    },
  }),
  { virtual: true },
);

jest.mock(
  '../../../organization/organization.repository',
  () => ({
    OrganizationRepository: class OrganizationRepository {},
  }),
  { virtual: true },
);

jest.mock(
  '../../../user/user.repository',
  () => ({
    UserRepository: class UserRepository {},
  }),
  { virtual: true },
);

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  BacklogItemStatus,
  OrganizationStatus,
  UserRole,
} from 'generated/prisma/enums';
import { ProgramBBacklogService } from './program-b-backlog.service';

describe('ProgramBBacklogService', () => {
  let service: ProgramBBacklogService;

  let backlogRepository: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    deleteDraftById: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    transaction: jest.Mock;
  };

  let organizationRepository: {
    findUnique: jest.Mock;
  };

  let userRepository: {
    findOrganizationMember: jest.Mock;
  };

  const owner = {
    id: 'owner-1',
    email: 'owner@example.com',
    role: UserRole.COMPANY_OWNER,
    status: 'ACTIVE',
    organizationId: 'org-1',
  } as const;

  const employee = {
    id: 'employee-1',
    email: 'employee@example.com',
    role: UserRole.COMPANY_EMPLOYEE,
    status: 'ACTIVE',
    organizationId: 'org-1',
  } as const;

  const activeOrganization = {
    id: 'org-1',
    status: OrganizationStatus.ACTIVE,
  };

  const draftItem = {
    id: 'item-1',
    organizationId: 'org-1',
    title: 'Knowledge base',
    description: 'Build onboarding knowledge base',
    budget: 2500,
    expectedOutcomes: 'Faster onboarding',
    productOwnerUserId: 'employee-1',
    status: BacklogItemStatus.DRAFT,
    createdAt: new Date('2026-05-05T10:00:00.000Z'),
    updatedAt: new Date('2026-05-05T10:00:00.000Z'),
  };

  beforeEach(() => {
    backlogRepository = {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteDraftById: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      transaction: jest.fn((fn: (db: object) => Promise<unknown>) => fn({})),
    };

    organizationRepository = {
      findUnique: jest.fn(),
    };

    userRepository = {
      findOrganizationMember: jest.fn(),
    };

    service = new ProgramBBacklogService(
      backlogRepository as never,
      organizationRepository as never,
      userRepository as never,
    );
  });

  it('creates a draft backlog item for an active organization member', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    userRepository.findOrganizationMember.mockResolvedValue({
      id: 'employee-1',
    });
    backlogRepository.create.mockResolvedValue(draftItem);

    const result = await service.create(
      {
        title: draftItem.title,
        productOwnerUserId: draftItem.productOwnerUserId ?? undefined,
      },
      owner as never,
    );

    expect(backlogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        status: BacklogItemStatus.DRAFT,
      }),
    );
    expect(result.id).toBe('item-1');
  });

  it('forbids backlog access for non-active organizations', async () => {
    organizationRepository.findUnique.mockResolvedValue({
      id: 'org-1',
      status: OrganizationStatus.PENDING,
    });

    await expect(
      service.listMy(
        {
          page: 1,
          limit: 20,
          sort: 'updatedAt',
          order: 'desc',
        },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects create when product owner is not in the same organization', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    userRepository.findOrganizationMember.mockResolvedValue(null);

    await expect(
      service.create({ productOwnerUserId: 'other-org-user' }, owner as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists organization backlog items with deterministic sorting', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findMany.mockResolvedValue([draftItem]);
    backlogRepository.count.mockResolvedValue(1);

    const result = await service.listMy(
      {
        page: 1,
        limit: 20,
        sort: 'updatedAt',
        order: 'desc',
        q: 'knowledge',
      },
      owner as never,
    );

    expect(backlogRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
    );
    expect(result.meta.total).toBe(1);
  });

  it('updates draft items only', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...draftItem,
      status: BacklogItemStatus.PUBLISHED,
    });

    await expect(
      service.update('item-1', { title: 'Updated' }, employee as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 for missing item update', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(null);

    await expect(
      service.update('item-1', { title: 'Updated' }, owner as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids cross-organization access', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...draftItem,
      organizationId: 'org-2',
    });

    await expect(
      service.remove('item-1', owner as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deletes only draft items', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(draftItem);
    backlogRepository.deleteDraftById.mockResolvedValue({ count: 1 });

    const result = await service.remove('item-1', owner as never);

    expect(backlogRepository.deleteDraftById).toHaveBeenCalledWith(
      'item-1',
      expect.anything(),
    );
    expect(result.id).toBe('item-1');
  });

  it('rejects publish when draft is incomplete', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...draftItem,
      description: null,
    });

    await expect(
      service.publish('item-1', owner as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishes a valid draft item', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(draftItem);
    userRepository.findOrganizationMember.mockResolvedValue({
      id: 'employee-1',
    });
    backlogRepository.updateMany.mockResolvedValue({ count: 1 });
    backlogRepository.update.mockResolvedValue({
      ...draftItem,
      status: BacklogItemStatus.PUBLISHED,
    });

    const result = await service.publish('item-1', owner as never);

    expect(backlogRepository.updateMany).toHaveBeenCalledWith(
      { id: 'item-1', status: BacklogItemStatus.DRAFT },
      { status: BacklogItemStatus.PUBLISHED },
      expect.anything(),
    );
    expect(result.status).toBe(BacklogItemStatus.PUBLISHED);
  });

  it('archives only draft or published items', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...draftItem,
      status: BacklogItemStatus.ARCHIVED,
    });

    await expect(
      service.archive('item-1', owner as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

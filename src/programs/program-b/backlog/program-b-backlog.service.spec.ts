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
    UserStatus: {
      PENDING: 'PENDING',
      ACTIVE: 'ACTIVE',
      SUSPENDED: 'SUSPENDED',
    },
    ProgramBTeamApplicationStatus: {
      SUBMITTED: 'SUBMITTED',
      WITHDRAWN: 'WITHDRAWN',
      SHORTLISTED: 'SHORTLISTED',
      ACCEPTED: 'ACCEPTED',
      REJECTED: 'REJECTED',
      PROJECT_CREATED: 'PROJECT_CREATED',
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

jest.mock('../team-application/program-b-team-application.repository', () => ({
  ProgramBTeamApplicationRepository: class ProgramBTeamApplicationRepository {},
}));

jest.mock('../projects/program-b-projects.repository', () => ({
  ProgramBProjectsRepository: class ProgramBProjectsRepository {},
}));

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  BacklogItemStatus,
  OrganizationStatus,
  ProgramBTeamApplicationStatus,
  UserRole,
  UserStatus,
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
    findActiveOrganizationMember: jest.Mock;
  };

  let teamApplicationRepository: {
    findCandidatesForBacklog?: jest.Mock;
    findUnique: jest.Mock;
    findUniqueWithCv: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };

  let projectsRepository: {
    findProjectByTeamApplicationId: jest.Mock;
    createProject: jest.Mock;
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

  const publishedItem = {
    ...draftItem,
    status: BacklogItemStatus.PUBLISHED,
  };

  const submittedCandidate = {
    id: 'candidate-1',
    backlogItemId: 'item-1',
    teamId: 'team-1',
    createdById: 'student-1',
    motivation: 'We can deliver this quickly',
    proposalText: 'Implementation plan',
    proposalFileId: null,
    status: ProgramBTeamApplicationStatus.SUBMITTED,
    submittedAt: new Date('2026-05-10T10:00:00.000Z'),
    shortlistedAt: null,
    acceptedAt: null,
    rejectedAt: null,
    withdrawnAt: null,
    decisionReason: null,
    createdAt: new Date('2026-05-10T10:00:00.000Z'),
    updatedAt: new Date('2026-05-10T10:00:00.000Z'),
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
      findActiveOrganizationMember: jest.fn(),
    };

    teamApplicationRepository = {
      findCandidatesForBacklog: jest.fn(),
      findUnique: jest.fn(),
      findUniqueWithCv: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    };

    projectsRepository = {
      findProjectByTeamApplicationId: jest.fn(),
      createProject: jest.fn(),
    };

    service = new ProgramBBacklogService(
      backlogRepository as never,
      organizationRepository as never,
      userRepository as never,
      teamApplicationRepository as never,
      projectsRepository as never,
    );
  });

  it('creates a draft backlog item for an active organization member', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    userRepository.findActiveOrganizationMember.mockResolvedValue({
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

  it('forbids backlog access for non-active users', async () => {
    await expect(
      service.listMy(
        {
          page: 1,
          limit: 20,
          sort: 'updatedAt',
          order: 'desc',
        },
        { ...owner, status: UserStatus.PENDING } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects create when product owner is not in the same organization', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    userRepository.findActiveOrganizationMember.mockResolvedValue(null);

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

  it('shortlists a submitted candidate for a published backlog item', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findUniqueWithCv
      .mockResolvedValueOnce(submittedCandidate)
      .mockResolvedValueOnce({
        ...submittedCandidate,
        status: ProgramBTeamApplicationStatus.SHORTLISTED,
        shortlistedAt: new Date('2026-05-17T10:00:00.000Z'),
        decisionReason: 'Strong domain match.',
      });
    teamApplicationRepository.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.shortlistCandidate(
      'item-1',
      'candidate-1',
      { reason: 'Strong domain match.' },
      owner as never,
    );

    expect(teamApplicationRepository.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'candidate-1',
        backlogItemId: 'item-1',
        status: ProgramBTeamApplicationStatus.SUBMITTED,
      }),
      expect.objectContaining({
        status: ProgramBTeamApplicationStatus.SHORTLISTED,
        decisionReason: 'Strong domain match.',
      }),
      {},
    );
    expect(result.status).toBe(ProgramBTeamApplicationStatus.SHORTLISTED);
  });

  it('lists backlog candidates for company-side review', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findCandidatesForBacklog = jest
      .fn()
      .mockResolvedValue([submittedCandidate]);

    const result = await service.listCandidates('item-1', owner as never);

    expect(
      teamApplicationRepository.findCandidatesForBacklog,
    ).toHaveBeenCalledWith('item-1');
    expect(result).toEqual([submittedCandidate]);
  });

  it('rejects shortlist from non-submitted status', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findUniqueWithCv.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.REJECTED,
    });

    await expect(
      service.shortlistCandidate(
        'item-1',
        'candidate-1',
        { reason: 'Retry' },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('accepts one candidate and rejects the remaining active ones', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findUniqueWithCv
      .mockResolvedValueOnce({
        ...submittedCandidate,
        status: ProgramBTeamApplicationStatus.SHORTLISTED,
      })
      .mockResolvedValueOnce({
        ...submittedCandidate,
        status: ProgramBTeamApplicationStatus.ACCEPTED,
        acceptedAt: new Date('2026-05-17T10:00:00.000Z'),
        decisionReason: 'Best delivery readiness.',
      });
    teamApplicationRepository.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 });

    const result = await service.acceptCandidate(
      'item-1',
      'candidate-1',
      { reason: 'Best delivery readiness.' },
      owner as never,
    );

    expect(teamApplicationRepository.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 'candidate-1',
        backlogItemId: 'item-1',
      }),
      expect.objectContaining({
        status: ProgramBTeamApplicationStatus.ACCEPTED,
        decisionReason: 'Best delivery readiness.',
      }),
      {},
    );
    expect(teamApplicationRepository.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        backlogItemId: 'item-1',
      }),
      expect.objectContaining({
        status: ProgramBTeamApplicationStatus.REJECTED,
      }),
      {},
    );
    expect(result.status).toBe(ProgramBTeamApplicationStatus.ACCEPTED);
  });

  it('rejects accept after candidate was already rejected', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findUniqueWithCv.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.REJECTED,
    });

    await expect(
      service.acceptCandidate(
        'item-1',
        'candidate-1',
        { reason: 'Reconsider' },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps duplicate acceptance races to a conflict', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.transaction.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.acceptCandidate(
        'item-1',
        'candidate-1',
        { reason: 'Winner' },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a project from an accepted candidate and marks it as handed off', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    userRepository.findActiveOrganizationMember.mockResolvedValue({
      id: 'employee-1',
    });
    backlogRepository.findUnique.mockResolvedValue({
      ...publishedItem,
      productOwnerUserId: 'employee-1',
    });
    teamApplicationRepository.findUniqueWithCv.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.ACCEPTED,
    });
    projectsRepository.findProjectByTeamApplicationId.mockResolvedValue(null);
    projectsRepository.createProject.mockResolvedValue({
      id: 'project-1',
      backlogItemId: 'item-1',
      applicationId: null,
      teamApplicationId: 'candidate-1',
      teamId: 'team-1',
      productOwnerUserId: 'employee-1',
      status: 'ACTIVE',
      acceptedByCompanyAt: null,
      acceptedByNtiAt: null,
      createdAt: new Date('2026-05-17T10:00:00.000Z'),
      updatedAt: new Date('2026-05-17T10:00:00.000Z'),
    });
    teamApplicationRepository.update.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.PROJECT_CREATED,
    });

    const result = await service.createProjectFromCandidate(
      'item-1',
      'candidate-1',
      owner as never,
    );

    expect(projectsRepository.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        backlogItemId: 'item-1',
        teamApplicationId: 'candidate-1',
        teamId: 'team-1',
      }),
      {},
    );
    expect(teamApplicationRepository.update).toHaveBeenCalledWith(
      { id: 'candidate-1' },
      { status: ProgramBTeamApplicationStatus.PROJECT_CREATED },
      {},
    );
    expect(result.id).toBe('project-1');
  });

  it('rejects project handoff for non-accepted candidates', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findUniqueWithCv.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.SHORTLISTED,
    });
    projectsRepository.findProjectByTeamApplicationId.mockResolvedValue(null);

    await expect(
      service.createProjectFromCandidate(
        'item-1',
        'candidate-1',
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects project handoff when backlog item has no product owner', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...publishedItem,
      productOwnerUserId: null,
    });
    teamApplicationRepository.findUniqueWithCv.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.ACCEPTED,
    });
    projectsRepository.findProjectByTeamApplicationId.mockResolvedValue(null);

    await expect(
      service.createProjectFromCandidate(
        'item-1',
        'candidate-1',
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the existing project on duplicate handoff attempts', async () => {
    const existingProject = {
      id: 'project-1',
      backlogItemId: 'item-1',
      applicationId: null,
      teamApplicationId: 'candidate-1',
      teamId: 'team-1',
      productOwnerUserId: 'employee-1',
      status: 'ACTIVE',
      acceptedByCompanyAt: null,
      acceptedByNtiAt: null,
      createdAt: new Date('2026-05-17T10:00:00.000Z'),
      updatedAt: new Date('2026-05-17T10:00:00.000Z'),
    };

    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.transaction.mockRejectedValue({ code: 'P2002' });
    projectsRepository.findProjectByTeamApplicationId.mockResolvedValue(
      existingProject,
    );

    const result = await service.createProjectFromCandidate(
      'item-1',
      'candidate-1',
      owner as never,
    );

    expect(result).toBe(existingProject);
  });

  it('rejects candidate decisions for archived backlog items', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...publishedItem,
      status: BacklogItemStatus.ARCHIVED,
    });

    await expect(
      service.rejectCandidate(
        'item-1',
        'candidate-1',
        { reason: 'Archived backlog' },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates draft items via conditional write', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique
      .mockResolvedValueOnce(draftItem)
      .mockResolvedValueOnce({
        ...draftItem,
        title: 'Updated',
      });
    backlogRepository.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.update(
      'item-1',
      { title: 'Updated' },
      employee as never,
    );

    expect(backlogRepository.updateMany).toHaveBeenCalledWith(
      { id: 'item-1', status: BacklogItemStatus.DRAFT },
      { title: 'Updated' },
      expect.anything(),
    );
    expect(backlogRepository.update).not.toHaveBeenCalled();
    expect(result.title).toBe('Updated');
  });

  it('rejects update when item stops being draft before write', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(draftItem);
    backlogRepository.updateMany.mockResolvedValue({ count: 0 });

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
    backlogRepository.findUnique
      .mockResolvedValueOnce(draftItem)
      .mockResolvedValueOnce({
        ...draftItem,
        status: BacklogItemStatus.PUBLISHED,
      });
    userRepository.findActiveOrganizationMember.mockResolvedValue({
      id: 'employee-1',
    });
    backlogRepository.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.publish('item-1', owner as never);

    expect(backlogRepository.findUnique).toHaveBeenNthCalledWith(
      1,
      { id: 'item-1' },
      expect.anything(),
    );
    expect(userRepository.findActiveOrganizationMember).toHaveBeenCalledWith(
      'org-1',
      'employee-1',
      expect.anything(),
    );
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

  it('archives without issuing a duplicate update', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique
      .mockResolvedValueOnce(draftItem)
      .mockResolvedValueOnce({
        ...draftItem,
        status: BacklogItemStatus.ARCHIVED,
      });
    backlogRepository.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.archive('item-1', owner as never);

    expect(backlogRepository.updateMany).toHaveBeenCalledWith(
      {
        id: 'item-1',
        status: {
          in: [BacklogItemStatus.DRAFT, BacklogItemStatus.PUBLISHED],
        },
      },
      { status: BacklogItemStatus.ARCHIVED },
      expect.anything(),
    );
    expect(backlogRepository.update).not.toHaveBeenCalled();
    expect(result.status).toBe(BacklogItemStatus.ARCHIVED);
  });
});

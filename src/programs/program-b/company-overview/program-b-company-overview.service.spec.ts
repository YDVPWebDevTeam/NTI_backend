import { ForbiddenException } from '@nestjs/common';
import {
  BacklogItemStatus,
  OrganizationStatus,
  ProgramBMilestoneStatus,
  ProgramBProjectStatus,
  ProgramBTeamApplicationStatus,
  UserRole,
  UserStatus,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UserRepository } from '../../../user/user.repository';
import { ProgramBCompanyPendingActionCode } from './dto/program-b-company-overview.dto';
import { ProgramBCompanyOverviewService } from './program-b-company-overview.service';

describe('ProgramBCompanyOverviewService', () => {
  let service: ProgramBCompanyOverviewService;
  let prisma: {
    client: {
      organization: { findUnique: jest.Mock };
      backlogItem: {
        groupBy: jest.Mock;
        count: jest.Mock;
        findMany: jest.Mock;
      };
      programBProject: {
        groupBy: jest.Mock;
        count: jest.Mock;
        findMany: jest.Mock;
      };
      programBTeamApplication: { groupBy: jest.Mock };
    };
  };
  let userRepository: {
    findActiveOrganizationMember: jest.Mock;
  };

  const user = {
    id: 'user-1',
    email: 'owner@example.com',
    role: UserRole.COMPANY_OWNER,
    status: UserStatus.ACTIVE,
    organizationId: 'org-1',
  };

  beforeEach(() => {
    prisma = {
      client: {
        organization: { findUnique: jest.fn() },
        backlogItem: {
          groupBy: jest.fn(),
          count: jest.fn(),
          findMany: jest.fn(),
        },
        programBProject: {
          groupBy: jest.fn(),
          count: jest.fn(),
          findMany: jest.fn(),
        },
        programBTeamApplication: { groupBy: jest.fn() },
      },
    };
    userRepository = {
      findActiveOrganizationMember: jest.fn(),
    };

    service = new ProgramBCompanyOverviewService(
      prisma as unknown as PrismaService,
      userRepository as unknown as UserRepository,
    );

    userRepository.findActiveOrganizationMember.mockResolvedValue({
      id: 'user-1',
    });
    prisma.client.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      status: OrganizationStatus.ACTIVE,
    });
  });

  it('returns aggregated overview counts and pending actions', async () => {
    prisma.client.backlogItem.groupBy.mockResolvedValue([
      { status: BacklogItemStatus.DRAFT, _count: { _all: 2 } },
      { status: BacklogItemStatus.PUBLISHED, _count: { _all: 3 } },
      { status: BacklogItemStatus.ARCHIVED, _count: { _all: 1 } },
    ]);
    prisma.client.backlogItem.count.mockResolvedValue(2);
    prisma.client.programBProject.groupBy.mockResolvedValue([
      { status: ProgramBProjectStatus.ACTIVE, _count: { _all: 4 } },
      { status: ProgramBProjectStatus.BLOCKED, _count: { _all: 1 } },
      { status: ProgramBProjectStatus.CLOSED, _count: { _all: 2 } },
    ]);
    prisma.client.programBProject.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    prisma.client.programBTeamApplication.groupBy.mockResolvedValue([
      { status: ProgramBTeamApplicationStatus.SUBMITTED, _count: { _all: 5 } },
      {
        status: ProgramBTeamApplicationStatus.SHORTLISTED,
        _count: { _all: 2 },
      },
      { status: ProgramBTeamApplicationStatus.ACCEPTED, _count: { _all: 1 } },
    ]);

    const result = await service.getOverview(user as never);

    expect(result.organization).toEqual({
      id: 'org-1',
      name: 'Acme',
      status: OrganizationStatus.ACTIVE,
    });
    expect(result.backlog).toEqual({
      total: 6,
      draft: 2,
      published: 3,
      archived: 1,
      withoutProductOwner: 2,
    });
    expect(result.projects).toEqual({
      total: 7,
      active: 5,
      completed: 2,
      awaitingFinalAcceptance: 3,
      overdueMilestones: 1,
    });
    expect(result.candidates).toEqual({
      submitted: 5,
      shortlisted: 2,
      accepted: 1,
      rejected: 0,
      pendingReview: 5,
    });
    expect(result.pendingActions).toEqual([
      {
        code: ProgramBCompanyPendingActionCode.ASSIGN_PRODUCT_OWNER,
        count: 2,
      },
      {
        code: ProgramBCompanyPendingActionCode.REVIEW_CANDIDATES,
        count: 5,
      },
      {
        code: ProgramBCompanyPendingActionCode.FINAL_ACCEPTANCE,
        count: 3,
      },
      {
        code: ProgramBCompanyPendingActionCode.OVERDUE_MILESTONE,
        count: 1,
      },
    ]);
  });

  it('maps backlog summary rows with candidate counters', async () => {
    prisma.client.backlogItem.findMany.mockResolvedValue([
      {
        id: 'backlog-1',
        title: null,
        status: BacklogItemStatus.PUBLISHED,
        budget: 1000,
        updatedAt: new Date('2026-05-20T10:00:00.000Z'),
        productOwner: {
          id: 'owner-1',
          firstName: 'Ava',
          lastName: 'Stone',
        },
        programBTeamApplications: [
          { status: ProgramBTeamApplicationStatus.SUBMITTED },
          { status: ProgramBTeamApplicationStatus.SHORTLISTED },
        ],
      },
    ]);
    prisma.client.backlogItem.count.mockResolvedValue(1);

    const result = await service.getBacklogSummary(
      user as never,
      {
        limit: 5,
        order: 'desc',
        sort: 'updatedAt',
      } as never,
    );

    expect(result).toEqual({
      items: [
        {
          id: 'backlog-1',
          title: 'Untitled backlog item',
          status: BacklogItemStatus.PUBLISHED,
          budget: 1000,
          productOwner: {
            id: 'owner-1',
            fullName: 'Ava Stone',
          },
          candidatesCount: 2,
          pendingCandidatesCount: 1,
          updatedAt: new Date('2026-05-20T10:00:00.000Z'),
        },
      ],
      total: 1,
    });
  });

  it('maps project summary rows with progress and next milestone', async () => {
    prisma.client.programBProject.findMany.mockResolvedValue([
      {
        id: 'project-1',
        status: ProgramBProjectStatus.ACTIVE,
        updatedAt: new Date('2026-05-21T10:00:00.000Z'),
        acceptedByCompanyAt: new Date('2026-05-20T10:00:00.000Z'),
        acceptedByNtiAt: null,
        backlogItem: { title: 'Portal redesign' },
        team: { name: 'Team Delta' },
        mentorUser: {
          id: 'mentor-1',
          firstName: 'Nina',
          lastName: 'Kovac',
        },
        milestones: [
          {
            id: 'm-1',
            title: 'Kickoff',
            dueAt: new Date('2026-05-22T10:00:00.000Z'),
            status: ProgramBMilestoneStatus.DONE,
            createdAt: new Date('2026-05-01T10:00:00.000Z'),
          },
          {
            id: 'm-2',
            title: 'Prototype',
            dueAt: new Date('2026-05-25T10:00:00.000Z'),
            status: ProgramBMilestoneStatus.IN_PROGRESS,
            createdAt: new Date('2026-05-02T10:00:00.000Z'),
          },
        ],
      },
    ]);
    prisma.client.programBProject.count.mockResolvedValue(1);

    const result = await service.getProjectSummary(
      user as never,
      {
        limit: 5,
        order: 'desc',
        sort: 'updatedAt',
      } as never,
    );

    expect(result).toEqual({
      items: [
        {
          id: 'project-1',
          title: 'Portal redesign',
          status: ProgramBProjectStatus.ACTIVE,
          teamName: 'Team Delta',
          mentor: {
            id: 'mentor-1',
            fullName: 'Nina Kovac',
          },
          progressPercent: 50,
          nextMilestone: {
            id: 'm-2',
            title: 'Prototype',
            dueAt: new Date('2026-05-25T10:00:00.000Z'),
            status: ProgramBMilestoneStatus.IN_PROGRESS,
          },
          awaitingFinalAcceptance: true,
          updatedAt: new Date('2026-05-21T10:00:00.000Z'),
        },
      ],
      total: 1,
    });
  });

  it('rejects users outside an active organization', async () => {
    prisma.client.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme',
      status: OrganizationStatus.SUSPENDED,
    });

    await expect(service.getOverview(user as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

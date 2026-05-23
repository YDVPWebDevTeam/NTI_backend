import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  BacklogItemStatus,
  OrganizationStatus,
  ProgramBMilestoneStatus,
  ProgramBProjectStatus,
  ProgramBTeamApplicationStatus,
  UserRole,
  UserStatus,
} from '../../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../../common/types/auth-user-context.type';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UserRepository } from '../../../user/user.repository';
import { CompanyBacklogSummaryQueryDto } from './dto/company-backlog-summary-query.dto';
import { CompanyBacklogSummaryDto } from './dto/company-backlog-summary.dto';
import {
  ACTIVE_PROJECT_STATUSES,
  ProgramBCompanyOverviewDto,
  ProgramBCompanyPendingActionCode,
  COMPLETED_PROJECT_STATUSES,
  OPEN_BACKLOG_STATUSES,
  REVIEWABLE_CANDIDATE_STATUSES,
} from './dto/program-b-company-overview.dto';
import { CompanyProjectSummaryQueryDto } from './dto/company-project-summary-query.dto';
import { CompanyProjectSummaryDto } from './dto/company-project-summary.dto';

@Injectable()
export class ProgramBCompanyOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
  ) {}

  async getOverview(
    user: AuthenticatedUserContext,
  ): Promise<ProgramBCompanyOverviewDto> {
    const organization = await this.ensureCompanyOverviewAccess(user);
    const now = new Date();

    const [
      backlogGrouped,
      openBacklogWithoutProductOwner,
      projectGrouped,
      awaitingFinalAcceptance,
      overdueMilestoneProjects,
      candidateGrouped,
    ] = await Promise.all([
      this.prisma.client.backlogItem.groupBy({
        by: ['status'],
        where: { organizationId: organization.id },
        _count: { _all: true },
      }),
      this.prisma.client.backlogItem.count({
        where: {
          organizationId: organization.id,
          status: { in: OPEN_BACKLOG_STATUSES },
          productOwnerUserId: null,
        },
      }),
      this.prisma.client.programBProject.groupBy({
        by: ['status'],
        where: {
          backlogItem: {
            organizationId: organization.id,
          },
        },
        _count: { _all: true },
      }),
      this.prisma.client.programBProject.count({
        where: {
          backlogItem: { organizationId: organization.id },
          status: { not: ProgramBProjectStatus.CLOSED },
          OR: [
            {
              acceptedByCompanyAt: { not: null },
              acceptedByNtiAt: null,
            },
            {
              acceptedByCompanyAt: null,
              acceptedByNtiAt: { not: null },
            },
          ],
        },
      }),
      this.prisma.client.programBProject.count({
        where: {
          backlogItem: { organizationId: organization.id },
          status: { in: ACTIVE_PROJECT_STATUSES },
          milestones: {
            some: {
              dueAt: { lt: now },
              status: { not: ProgramBMilestoneStatus.DONE },
            },
          },
        },
      }),
      this.prisma.client.programBTeamApplication.groupBy({
        by: ['status'],
        where: {
          backlogItem: {
            organizationId: organization.id,
          },
        },
        _count: { _all: true },
      }),
    ]);

    const backlogCounts = this.toCountMap(backlogGrouped);
    const projectCounts = this.toCountMap(projectGrouped);
    const candidateCounts = this.toCountMap(candidateGrouped);

    const pendingActions = [
      {
        code: ProgramBCompanyPendingActionCode.ASSIGN_PRODUCT_OWNER,
        count: openBacklogWithoutProductOwner,
      },
      {
        code: ProgramBCompanyPendingActionCode.REVIEW_CANDIDATES,
        count: REVIEWABLE_CANDIDATE_STATUSES.reduce(
          (sum, status) => sum + (candidateCounts[status] ?? 0),
          0,
        ),
      },
      {
        code: ProgramBCompanyPendingActionCode.FINAL_ACCEPTANCE,
        count: awaitingFinalAcceptance,
      },
      {
        code: ProgramBCompanyPendingActionCode.OVERDUE_MILESTONE,
        count: overdueMilestoneProjects,
      },
    ].filter((item) => item.count > 0);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
      },
      backlog: {
        total: Object.values(backlogCounts).reduce(
          (sum, count) => sum + count,
          0,
        ),
        draft: backlogCounts[BacklogItemStatus.DRAFT] ?? 0,
        published: backlogCounts[BacklogItemStatus.PUBLISHED] ?? 0,
        archived: backlogCounts[BacklogItemStatus.ARCHIVED] ?? 0,
        withoutProductOwner: openBacklogWithoutProductOwner,
      },
      projects: {
        total: Object.values(projectCounts).reduce(
          (sum, count) => sum + count,
          0,
        ),
        active: ACTIVE_PROJECT_STATUSES.reduce(
          (sum, status) => sum + (projectCounts[status] ?? 0),
          0,
        ),
        completed: COMPLETED_PROJECT_STATUSES.reduce(
          (sum, status) => sum + (projectCounts[status] ?? 0),
          0,
        ),
        awaitingFinalAcceptance,
        overdueMilestones: overdueMilestoneProjects,
      },
      candidates: {
        submitted:
          candidateCounts[ProgramBTeamApplicationStatus.SUBMITTED] ?? 0,
        shortlisted:
          candidateCounts[ProgramBTeamApplicationStatus.SHORTLISTED] ?? 0,
        accepted: candidateCounts[ProgramBTeamApplicationStatus.ACCEPTED] ?? 0,
        rejected: candidateCounts[ProgramBTeamApplicationStatus.REJECTED] ?? 0,
        pendingReview: REVIEWABLE_CANDIDATE_STATUSES.reduce(
          (sum, status) => sum + (candidateCounts[status] ?? 0),
          0,
        ),
      },
      pendingActions,
      updatedAt: now,
    };
  }

  async getBacklogSummary(
    user: AuthenticatedUserContext,
    query: CompanyBacklogSummaryQueryDto,
  ): Promise<CompanyBacklogSummaryDto> {
    const organization = await this.ensureCompanyOverviewAccess(user);
    const where: Prisma.BacklogItemWhereInput = {
      organizationId: organization.id,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.backlogItem.findMany({
        where,
        take: query.limit,
        orderBy: this.buildBacklogSummaryOrderBy(query),
        select: {
          id: true,
          title: true,
          status: true,
          budget: true,
          updatedAt: true,
          productOwner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          programBTeamApplications: {
            select: {
              status: true,
            },
          },
        },
      }),
      this.prisma.client.backlogItem.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title?.trim() || 'Untitled backlog item',
        status: item.status,
        budget: item.budget,
        productOwner: item.productOwner
          ? {
              id: item.productOwner.id,
              fullName: this.toFullName(
                item.productOwner.firstName,
                item.productOwner.lastName,
              ),
            }
          : null,
        candidatesCount: item.programBTeamApplications.length,
        pendingCandidatesCount: item.programBTeamApplications.filter(
          (application) =>
            application.status === ProgramBTeamApplicationStatus.SUBMITTED,
        ).length,
        updatedAt: item.updatedAt,
      })),
      total,
    };
  }

  async getProjectSummary(
    user: AuthenticatedUserContext,
    query: CompanyProjectSummaryQueryDto,
  ): Promise<CompanyProjectSummaryDto> {
    const organization = await this.ensureCompanyOverviewAccess(user);
    const where: Prisma.ProgramBProjectWhereInput = {
      backlogItem: {
        organizationId: organization.id,
      },
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.programBProject.findMany({
        where,
        take: query.limit,
        orderBy: this.buildProjectSummaryOrderBy(query),
        select: {
          id: true,
          status: true,
          updatedAt: true,
          acceptedByCompanyAt: true,
          acceptedByNtiAt: true,
          backlogItem: {
            select: {
              title: true,
            },
          },
          team: {
            select: {
              name: true,
            },
          },
          mentorUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          milestones: {
            select: {
              id: true,
              title: true,
              dueAt: true,
              status: true,
              createdAt: true,
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          },
        },
      }),
      this.prisma.client.programBProject.count({ where }),
    ]);

    return {
      items: items.map((item) => {
        const nextMilestone = this.resolveNextMilestone(item.milestones);
        const totalMilestones = item.milestones.length;
        const doneMilestones = item.milestones.filter(
          (milestone) => milestone.status === ProgramBMilestoneStatus.DONE,
        ).length;

        return {
          id: item.id,
          title: item.backlogItem.title?.trim() || 'Untitled project',
          status: item.status,
          teamName: item.team.name,
          mentor: item.mentorUser
            ? {
                id: item.mentorUser.id,
                fullName: this.toFullName(
                  item.mentorUser.firstName,
                  item.mentorUser.lastName,
                ),
              }
            : null,
          progressPercent:
            totalMilestones > 0
              ? Math.round((doneMilestones / totalMilestones) * 100)
              : null,
          nextMilestone,
          awaitingFinalAcceptance: this.isAwaitingFinalAcceptance(item),
          updatedAt: item.updatedAt,
        };
      }),
      total,
    };
  }

  private async ensureCompanyOverviewAccess(user: AuthenticatedUserContext) {
    if (
      user.status !== UserStatus.ACTIVE ||
      (user.role !== UserRole.COMPANY_OWNER &&
        user.role !== UserRole.COMPANY_EMPLOYEE) ||
      !user.organizationId
    ) {
      throw new ForbiddenException(
        'Only active company users linked to an organization can access the company overview',
      );
    }

    const organizationMember =
      await this.userRepository.findActiveOrganizationMember(
        user.organizationId,
        user.id,
      );

    if (!organizationMember) {
      throw new ForbiddenException(
        'Only active company users linked to an organization can access the company overview',
      );
    }

    const organization = await this.prisma.client.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!organization || organization.status !== OrganizationStatus.ACTIVE) {
      throw new ForbiddenException(
        'Only active company users from active organizations can access the company overview',
      );
    }

    return organization;
  }

  private toCountMap<T extends string>(
    rows: Array<{ status: T; _count: { _all: number } }>,
  ): Partial<Record<T, number>> {
    return rows.reduce<Partial<Record<T, number>>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});
  }

  private buildBacklogSummaryOrderBy(
    query: CompanyBacklogSummaryQueryDto,
  ): Prisma.BacklogItemOrderByWithRelationInput[] {
    switch (query.sort) {
      case 'createdAt':
      case 'updatedAt':
      case 'budget':
        return [{ [query.sort]: query.order }, { id: 'asc' }];
      case 'title':
        return [{ title: query.order }, { id: 'asc' }];
      default:
        return [{ updatedAt: 'desc' }, { id: 'asc' }];
    }
  }

  private buildProjectSummaryOrderBy(
    query: CompanyProjectSummaryQueryDto,
  ): Prisma.ProgramBProjectOrderByWithRelationInput[] {
    switch (query.sort) {
      case 'createdAt':
      case 'updatedAt':
        return [{ [query.sort]: query.order }, { id: 'asc' }];
      case 'title':
        return [{ backlogItem: { title: query.order } }, { id: 'asc' }];
      case 'teamName':
        return [{ team: { name: query.order } }, { id: 'asc' }];
      default:
        return [{ updatedAt: 'desc' }, { id: 'asc' }];
    }
  }

  private resolveNextMilestone(
    milestones: Array<{
      id: string;
      title: string;
      dueAt: Date | null;
      status: ProgramBMilestoneStatus;
      createdAt: Date;
    }>,
  ) {
    const pendingMilestones = milestones.filter(
      (milestone) => milestone.status !== ProgramBMilestoneStatus.DONE,
    );

    if (pendingMilestones.length === 0) {
      return null;
    }

    pendingMilestones.sort((left, right) => {
      if (left.dueAt && right.dueAt) {
        return left.dueAt.getTime() - right.dueAt.getTime();
      }

      if (left.dueAt) {
        return -1;
      }

      if (right.dueAt) {
        return 1;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    });

    const milestone = pendingMilestones[0];

    return {
      id: milestone.id,
      title: milestone.title,
      dueAt: milestone.dueAt,
      status: milestone.status,
    };
  }

  private isAwaitingFinalAcceptance(project: {
    status: ProgramBProjectStatus;
    acceptedByCompanyAt: Date | null;
    acceptedByNtiAt: Date | null;
  }): boolean {
    if (project.status === ProgramBProjectStatus.CLOSED) {
      return false;
    }

    return (
      Boolean(project.acceptedByCompanyAt) !== Boolean(project.acceptedByNtiAt)
    );
  }

  private toFullName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.trim();
  }
}

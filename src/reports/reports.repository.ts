import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  CallStatus,
  ProgramBProjectStatus,
} from '../../generated/prisma/enums';
import { PrismaService } from '../infrastructure/database/prisma.service';

const applicationsReportSelect = {
  id: true,
  status: true,
  submittedAt: true,
  decidedAt: true,
  createdAt: true,
  updatedAt: true,
  call: {
    select: {
      type: true,
      title: true,
    },
  },
  team: {
    select: {
      name: true,
    },
  },
  createdBy: {
    select: {
      email: true,
    },
  },
} satisfies Prisma.ApplicationSelect;

const programBReportSelect = {
  id: true,
  status: true,
  submittedAt: true,
  shortlistedAt: true,
  acceptedAt: true,
  rejectedAt: true,
  withdrawnAt: true,
  createdAt: true,
  backlogItem: {
    select: {
      title: true,
      organization: {
        select: {
          name: true,
        },
      },
    },
  },
  team: {
    select: {
      name: true,
    },
  },
  createdBy: {
    select: {
      email: true,
    },
  },
} satisfies Prisma.ProgramBTeamApplicationSelect;

export type ApplicationsReportRecord = Prisma.ApplicationGetPayload<{
  select: typeof applicationsReportSelect;
}>;

export type ProgramBReportRecord = Prisma.ProgramBTeamApplicationGetPayload<{
  select: typeof programBReportSelect;
}>;

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<{
    applicationsByStatus: Array<{ status: string; count: number }>;
    activeProjectsCount: number;
    organizationsByStatus: Array<{ status: string; count: number }>;
    callsOpenCount: number;
    decisionsLast30Days: number;
  }> {
    const [
      applicationsByStatus,
      activeProjectsCount,
      organizationsByStatus,
      callsOpenCount,
      decisionsLast30Days,
    ] = await Promise.all([
      this.prisma.client.application.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.client.programBProject.count({
        where: { status: ProgramBProjectStatus.ACTIVE },
      }),
      this.prisma.client.organization.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.client.call.count({
        where: { status: CallStatus.OPEN },
      }),
      this.prisma.client.application.count({
        where: {
          decidedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      applicationsByStatus: applicationsByStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      activeProjectsCount,
      organizationsByStatus: organizationsByStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      callsOpenCount,
      decisionsLast30Days,
    };
  }

  countApplications(where: Prisma.ApplicationWhereInput): Promise<number> {
    return this.prisma.client.application.count({ where });
  }

  findApplications(args: {
    where: Prisma.ApplicationWhereInput;
    orderBy: Prisma.ApplicationOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<ApplicationsReportRecord[]> {
    return this.prisma.client.application.findMany({
      where: args.where,
      orderBy: args.orderBy,
      skip: args.skip,
      take: args.take,
      select: applicationsReportSelect,
    });
  }

  countProgramBApplications(
    where: Prisma.ProgramBTeamApplicationWhereInput,
  ): Promise<number> {
    return this.prisma.client.programBTeamApplication.count({ where });
  }

  findProgramBApplications(args: {
    where: Prisma.ProgramBTeamApplicationWhereInput;
    orderBy: Prisma.ProgramBTeamApplicationOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<ProgramBReportRecord[]> {
    return this.prisma.client.programBTeamApplication.findMany({
      where: args.where,
      orderBy: args.orderBy,
      skip: args.skip,
      take: args.take,
      select: programBReportSelect,
    });
  }
}

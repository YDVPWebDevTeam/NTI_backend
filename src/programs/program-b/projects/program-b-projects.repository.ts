import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ProgramBProjectStatus } from 'generated/prisma/enums';
import {
  PrismaDbClient,
  PrismaTransactionOptions,
  PrismaService,
} from '../../../infrastructure/database';

const projectExecutionSelect = {
  id: true,
  backlogItemId: true,
  applicationId: true,
  teamId: true,
  productOwnerUserId: true,
  status: true,
  acceptedByCompanyAt: true,
  acceptedByNtiAt: true,
  createdAt: true,
  updatedAt: true,
  backlogItem: {
    select: {
      id: true,
      organizationId: true,
    },
  },
} satisfies Prisma.ProgramBProjectSelect;

export type ProgramBProjectExecutionView = Prisma.ProgramBProjectGetPayload<{
  select: typeof projectExecutionSelect;
}>;

@Injectable()
export class ProgramBProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(
    fn: (client: Prisma.TransactionClient) => Promise<T>,
    options?: PrismaTransactionOptions,
  ): Promise<T> {
    return this.prisma.client.$transaction(fn, options);
  }

  findProjectForExecution(
    id: string,
    db?: PrismaDbClient,
  ): Promise<ProgramBProjectExecutionView | null> {
    return (db ?? this.prisma.client).programBProject.findUnique({
      where: { id },
      select: projectExecutionSelect,
    });
  }

  createMilestone(
    data: Prisma.ProgramBMilestoneUncheckedCreateInput,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBMilestone.create({ data });
  }

  updateMilestoneForProject(
    projectId: string,
    milestoneId: string,
    data: Prisma.ProgramBMilestoneUncheckedUpdateInput,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBMilestone.updateMany({
      where: {
        id: milestoneId,
        projectId,
      },
      data,
    });
  }

  findMilestoneForProject(
    projectId: string,
    milestoneId: string,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBMilestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
      },
    });
  }

  createMentoringNote(
    data: Prisma.ProgramBMentoringNoteUncheckedCreateInput,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBMentoringNote.create({ data });
  }

  createPoReview(
    data: Prisma.ProgramBPoReviewUncheckedCreateInput,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBPoReview.create({ data });
  }

  updateProjectAcceptance(
    projectId: string,
    data: {
      acceptedByCompanyAt?: Date;
      acceptedByNtiAt?: Date;
      status?: ProgramBProjectStatus;
    },
    db?: PrismaDbClient,
  ): Promise<ProgramBProjectExecutionView> {
    return (db ?? this.prisma.client).programBProject.update({
      where: { id: projectId },
      data,
      select: projectExecutionSelect,
    });
  }
}

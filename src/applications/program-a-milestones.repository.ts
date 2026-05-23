import { Injectable } from '@nestjs/common';
import type { Prisma, ProgramAMilestone } from '../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

export type ProgramAMilestoneWithApplication =
  Prisma.ProgramAMilestoneGetPayload<{
    select: ReturnType<ProgramAMilestonesRepository['milestoneSelect']>;
  }>;

@Injectable()
export class ProgramAMilestonesRepository extends BaseRepository<
  ProgramAMilestone,
  Prisma.ProgramAMilestoneUncheckedCreateInput,
  Prisma.ProgramAMilestoneUncheckedUpdateInput,
  Prisma.ProgramAMilestoneWhereInput,
  Prisma.ProgramAMilestoneWhereUniqueInput,
  Prisma.ProgramAMilestoneOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).programAMilestone;
  }

  createMilestone(
    data: Prisma.ProgramAMilestoneUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<ProgramAMilestoneWithApplication> {
    return (db ?? this.prisma.client).programAMilestone.create({
      data,
      select: this.milestoneSelect(),
    });
  }

  listByApplication(
    applicationId: string,
    db?: PrismaDbClient,
  ): Promise<ProgramAMilestoneWithApplication[]> {
    return (db ?? this.prisma.client).programAMilestone.findMany({
      where: {
        applicationId,
      },
      orderBy: [
        {
          dueAt: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
      select: this.milestoneSelect(),
    });
  }

  findByIdForApplication(
    applicationId: string,
    milestoneId: string,
    db?: PrismaDbClient,
  ): Promise<ProgramAMilestoneWithApplication | null> {
    return (db ?? this.prisma.client).programAMilestone.findFirst({
      where: {
        id: milestoneId,
        applicationId,
      },
      select: this.milestoneSelect(),
    });
  }

  updateMilestone(
    milestoneId: string,
    data: Prisma.ProgramAMilestoneUncheckedUpdateInput,
    db?: PrismaDbClient,
  ): Promise<ProgramAMilestoneWithApplication> {
    return (db ?? this.prisma.client).programAMilestone.update({
      where: {
        id: milestoneId,
      },
      data,
      select: this.milestoneSelect(),
    });
  }

  private milestoneSelect() {
    return {
      id: true,
      applicationId: true,
      title: true,
      description: true,
      dueAt: true,
      status: true,
      progressNote: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }
}

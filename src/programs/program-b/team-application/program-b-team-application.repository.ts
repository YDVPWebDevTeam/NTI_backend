import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  ProgramBTeamApplication,
} from 'generated/prisma/client';
import {
  BaseRepository,
  PrismaDbClient,
  PrismaService,
} from '../../../infrastructure/database';

type ProgramBTeamApplicationDelegate = PrismaClient['programBTeamApplication'];

@Injectable()
export class ProgramBTeamApplicationRepository extends BaseRepository<
  ProgramBTeamApplication,
  Prisma.ProgramBTeamApplicationUncheckedCreateInput,
  Prisma.ProgramBTeamApplicationUncheckedUpdateInput,
  Prisma.ProgramBTeamApplicationWhereInput,
  Prisma.ProgramBTeamApplicationWhereUniqueInput,
  Prisma.ProgramBTeamApplicationOrderByWithRelationInput
> {
  private readonly candidateWithCvSelect = {
    id: true,
    backlogItemId: true,
    teamId: true,
    createdById: true,
    motivation: true,
    proposalText: true,
    proposalFileId: true,
    status: true,
    submittedAt: true,
    shortlistedAt: true,
    acceptedAt: true,
    rejectedAt: true,
    withdrawnAt: true,
    decisionReason: true,
    createdAt: true,
    updatedAt: true,
    cvAttachments: {
      select: {
        id: true,
        teamMemberUserId: true,
        uploadedFileId: true,
        uploadedFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
          },
        },
      },
    },
  } satisfies Prisma.ProgramBTeamApplicationSelect;

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient): ProgramBTeamApplicationDelegate {
    return (db ?? this.prisma.client).programBTeamApplication;
  }

  findCandidatesForBacklog(backlogItemId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).programBTeamApplication.findMany({
      where: { backlogItemId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: this.candidateWithCvSelect,
    });
  }

  findUniqueWithCv(
    where: Prisma.ProgramBTeamApplicationWhereUniqueInput,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBTeamApplication.findUnique({
      where,
      select: this.candidateWithCvSelect,
    });
  }
}

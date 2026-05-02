import { Injectable } from '@nestjs/common';
import type { Application, Prisma } from '../../generated/prisma/client';
import { ApplicationStatus } from '../../generated/prisma/enums';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

export type ApplicationWithRelations = Prisma.ApplicationGetPayload<{
  select: ReturnType<ApplicationsRepository['applicationDetailSelect']>;
}>;

export type ApplicationWorkflowView = Prisma.ApplicationGetPayload<{
  select: ReturnType<ApplicationsRepository['applicationWorkflowSelect']>;
}>;

@Injectable()
export class ApplicationsRepository extends BaseRepository<
  Application,
  Prisma.ApplicationUncheckedCreateInput,
  Prisma.ApplicationUncheckedUpdateInput,
  Prisma.ApplicationWhereInput,
  Prisma.ApplicationWhereUniqueInput,
  Prisma.ApplicationOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).application;
  }

  findByIdWithRelations(
    id: string,
    db?: PrismaDbClient,
  ): Promise<ApplicationWithRelations | null> {
    return (db ?? this.prisma.client).application.findUnique({
      where: { id },
      select: this.applicationDetailSelect(),
    });
  }

  findByIdForWorkflow(
    id: string,
    db?: PrismaDbClient,
  ): Promise<ApplicationWorkflowView | null> {
    return (db ?? this.prisma.client).application.findUnique({
      where: { id },
      select: this.applicationWorkflowSelect(),
    });
  }

  createDraft(
    callId: string,
    teamId: string,
    createdById: string,
    db?: PrismaDbClient,
  ): Promise<ApplicationWithRelations> {
    return (db ?? this.prisma.client).application.create({
      data: {
        callId,
        teamId,
        createdById,
      },
      select: this.applicationDetailSelect(),
    });
  }

  findActiveByTeamAndCall(
    teamId: string,
    callId: string,
    db?: PrismaDbClient,
  ): Promise<Pick<Application, 'id' | 'status'> | null> {
    return (db ?? this.prisma.client).application.findFirst({
      where: {
        teamId,
        callId,
        status: {
          notIn: [ApplicationStatus.REJECTED, ApplicationStatus.ARCHIVED],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  submitDraft(
    id: string,
    submittedAt: Date,
    db?: PrismaDbClient,
  ): Promise<Application> {
    return this.update(
      { id },
      {
        status: ApplicationStatus.SUBMITTED,
        submittedAt,
      },
      db,
    );
  }

  private applicationDetailSelect() {
    return {
      id: true,
      callId: true,
      teamId: true,
      createdById: true,
      status: true,
      submittedAt: true,
      decidedAt: true,
      createdAt: true,
      updatedAt: true,
      call: {
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          opensAt: true,
          closesAt: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          leaderId: true,
          archivedAt: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
        },
      },
    } as const;
  }

  private applicationWorkflowSelect() {
    return {
      id: true,
      callId: true,
      teamId: true,
      createdById: true,
      status: true,
      submittedAt: true,
      decidedAt: true,
      createdAt: true,
      updatedAt: true,
      call: {
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          opensAt: true,
          closesAt: true,
          requiredDocumentTypes: {
            where: {
              isRequired: true,
            },
            select: {
              id: true,
              documentType: true,
              isRequired: true,
            },
          },
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          leaderId: true,
          lockedAt: true,
          archivedAt: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      },
      documents: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          documentType: true,
          documentScope: true,
          memberUserId: true,
          version: true,
          isActive: true,
          uploadedFileId: true,
          createdAt: true,
        },
      },
    } as const;
  }
}

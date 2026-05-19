import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  BacklogItemStatus,
  ProgramBProjectStatus,
  UserRole,
} from 'generated/prisma/enums';
import {
  PrismaDbClient,
  PrismaTransactionOptions,
  PrismaService,
} from '../../../infrastructure/database';

const userSummarySelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

const backlogDocumentSelect = {
  id: true,
  category: true,
  visibility: true,
  version: true,
  isActive: true,
  createdAt: true,
  uploadedFile: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      status: true,
      uploadedAt: true,
    },
  },
} satisfies Prisma.ProgramBBacklogDocumentSelect;

const projectDocumentSelect = {
  id: true,
  category: true,
  visibility: true,
  version: true,
  isActive: true,
  createdAt: true,
  uploadedFile: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      status: true,
      uploadedAt: true,
      key: true,
    },
  },
} satisfies Prisma.ProgramBProjectDocumentSelect;

const projectExecutionSelect = {
  id: true,
  backlogItemId: true,
  applicationId: true,
  teamApplicationId: true,
  teamId: true,
  productOwnerUserId: true,
  mentorUserId: true,
  mentorAssignedAt: true,
  mentorAssignedById: true,
  status: true,
  acceptedByCompanyAt: true,
  acceptedByNtiAt: true,
  createdAt: true,
  updatedAt: true,
  backlogItem: {
    select: {
      id: true,
      organizationId: true,
      status: true,
    },
  },
  application: {
    select: {
      id: true,
      mentorUserId: true,
    },
  },
  teamApplication: {
    select: {
      id: true,
      createdById: true,
    },
  },
} satisfies Prisma.ProgramBProjectSelect;

const projectDetailSelect = {
  id: true,
  backlogItemId: true,
  applicationId: true,
  teamApplicationId: true,
  teamId: true,
  productOwnerUserId: true,
  mentorUserId: true,
  mentorAssignedAt: true,
  mentorAssignedById: true,
  status: true,
  acceptedByCompanyAt: true,
  acceptedByNtiAt: true,
  createdAt: true,
  updatedAt: true,
  productOwnerUser: {
    select: userSummarySelect,
  },
  mentorUser: {
    select: userSummarySelect,
  },
  mentorAssignedBy: {
    select: userSummarySelect,
  },
  backlogItem: {
    select: {
      id: true,
      organizationId: true,
      title: true,
      description: true,
      budget: true,
      expectedOutcomes: true,
      productOwnerUserId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      productOwner: {
        select: userSummarySelect,
      },
      documents: {
        where: {
          isActive: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: backlogDocumentSelect,
      },
    },
  },
  team: {
    select: {
      id: true,
      name: true,
      members: {
        select: {
          user: {
            select: userSummarySelect,
          },
        },
      },
    },
  },
  milestones: {
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  },
  mentoringNotes: {
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      note: true,
      createdAt: true,
      authorUser: {
        select: userSummarySelect,
      },
    },
  },
  poReviews: {
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      decision: true,
      comment: true,
      createdAt: true,
      authorUser: {
        select: userSummarySelect,
      },
    },
  },
  documents: {
    where: {
      isActive: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: projectDocumentSelect,
  },
} satisfies Prisma.ProgramBProjectSelect;

export type ProgramBProjectExecutionView = Prisma.ProgramBProjectGetPayload<{
  select: typeof projectExecutionSelect;
}>;

export type ProgramBProjectDetailView = Prisma.ProgramBProjectGetPayload<{
  select: typeof projectDetailSelect;
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

  findProjectDetail(
    id: string,
    db?: PrismaDbClient,
  ): Promise<ProgramBProjectDetailView | null> {
    return (db ?? this.prisma.client).programBProject.findUnique({
      where: { id },
      select: projectDetailSelect,
    });
  }

  listProjectsForUser(
    user: {
      id: string;
      role: UserRole;
      organizationId: string | null;
    },
    db?: PrismaDbClient,
  ): Promise<ProgramBProjectDetailView[]> {
    const where = this.buildProjectAccessWhere(user);

    return (db ?? this.prisma.client).programBProject.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      select: projectDetailSelect,
    });
  }

  private buildProjectAccessWhere(user: {
    id: string;
    role: UserRole;
    organizationId: string | null;
  }): Prisma.ProgramBProjectWhereInput {
    if (
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.EVALUATOR
    ) {
      return {};
    }

    if (
      user.role === UserRole.COMPANY_OWNER ||
      user.role === UserRole.COMPANY_EMPLOYEE
    ) {
      if (!user.organizationId) {
        return { OR: [] };
      }

      return {
        backlogItem: {
          organizationId: user.organizationId,
        },
      };
    }

    if (user.role === UserRole.MENTOR) {
      return {
        mentorUserId: user.id,
      };
    }

    return {
      team: {
        members: {
          some: {
            userId: user.id,
          },
        },
      },
    };
  }

  findProjectByTeamApplicationId(
    teamApplicationId: string,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBProject.findUnique({
      where: { teamApplicationId },
    });
  }

  createProject(
    data: Prisma.ProgramBProjectUncheckedCreateInput,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBProject.create({ data });
  }

  updateProject(
    id: string,
    data: Prisma.ProgramBProjectUncheckedUpdateInput,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBProject.update({
      where: { id },
      data,
      select: projectExecutionSelect,
    });
  }

  createMilestone(
    data: Prisma.ProgramBMilestoneUncheckedCreateInput,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBMilestone.create({ data });
  }

  listMilestones(projectId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).programBMilestone.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
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

  listMentoringNotes(projectId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).programBMentoringNote.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        note: true,
        createdAt: true,
        authorUser: {
          select: userSummarySelect,
        },
      },
    });
  }

  createPoReview(
    data: Prisma.ProgramBPoReviewUncheckedCreateInput,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBPoReview.create({ data });
  }

  listPoReviews(projectId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).programBPoReview.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        decision: true,
        comment: true,
        createdAt: true,
        authorUser: {
          select: userSummarySelect,
        },
      },
    });
  }

  createProjectDocument(
    data: Prisma.ProgramBProjectDocumentUncheckedCreateInput,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBProjectDocument.create({
      data,
      select: projectDocumentSelect,
    });
  }

  listProjectDocuments(projectId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).programBProjectDocument.findMany({
      where: {
        projectId,
        isActive: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: projectDocumentSelect,
    });
  }

  findProjectDocumentById(documentId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).programBProjectDocument.findUnique({
      where: { id: documentId },
      select: {
        ...projectDocumentSelect,
        projectId: true,
      },
    });
  }

  acceptProjectByCompany(
    projectId: string,
    acceptedAt: Date,
    shouldClose: boolean,
    db?: PrismaDbClient,
  ): Promise<ProgramBProjectExecutionView> {
    return (db ?? this.prisma.client).programBProject.update({
      where: { id: projectId },
      data: {
        acceptedByCompanyAt: acceptedAt,
        ...(shouldClose ? { status: ProgramBProjectStatus.CLOSED } : {}),
      },
      select: projectExecutionSelect,
    });
  }

  acceptProjectByNti(
    projectId: string,
    acceptedAt: Date,
    shouldClose: boolean,
    db?: PrismaDbClient,
  ): Promise<ProgramBProjectExecutionView> {
    return (db ?? this.prisma.client).programBProject.update({
      where: { id: projectId },
      data: {
        acceptedByNtiAt: acceptedAt,
        ...(shouldClose ? { status: ProgramBProjectStatus.CLOSED } : {}),
      },
      select: projectExecutionSelect,
    });
  }

  updateBacklogStatusForProject(
    backlogItemId: string,
    status: BacklogItemStatus,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).backlogItem.update({
      where: { id: backlogItemId },
      data: { status },
    });
  }
}

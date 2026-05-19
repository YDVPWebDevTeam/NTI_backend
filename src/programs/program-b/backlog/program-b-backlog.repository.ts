import { Injectable } from '@nestjs/common';
import { BacklogItem, Prisma, PrismaClient } from 'generated/prisma/client';
import { BacklogItemStatus } from 'generated/prisma/enums';
import {
  BaseRepository,
  PrismaDbClient,
  PrismaService,
} from '../../../infrastructure/database';

const userSummarySelect = {
  id: true,
  firstName: true,
  lastName: true,
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
      key: true,
    },
  },
} satisfies Prisma.ProgramBBacklogDocumentSelect;

export const backlogDetailSelect = {
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
} satisfies Prisma.BacklogItemSelect;

export type ProgramBBacklogDetailView = Prisma.BacklogItemGetPayload<{
  select: typeof backlogDetailSelect;
}>;

type BacklogItemDelegate = PrismaClient['backlogItem'];

@Injectable()
export class ProgramBBacklogRepository extends BaseRepository<
  BacklogItem,
  Prisma.BacklogItemUncheckedCreateInput,
  Prisma.BacklogItemUncheckedUpdateInput,
  Prisma.BacklogItemWhereInput,
  Prisma.BacklogItemWhereUniqueInput,
  Prisma.BacklogItemOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient): BacklogItemDelegate {
    return (db ?? this.prisma.client).backlogItem;
  }

  findDetailUnique(
    where: Prisma.BacklogItemWhereUniqueInput,
    db?: PrismaDbClient,
  ): Promise<ProgramBBacklogDetailView | null> {
    return this.getDelegate(db).findUnique({
      where,
      select: backlogDetailSelect,
    });
  }

  findDetails(
    args: {
      where?: Prisma.BacklogItemWhereInput;
      orderBy?: Prisma.BacklogItemOrderByWithRelationInput[];
      skip?: number;
      take?: number;
    },
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).backlogItem.findMany({
      ...args,
      select: backlogDetailSelect,
    });
  }

  deleteDraftById(
    id: string,
    db?: PrismaDbClient,
  ): Promise<Prisma.BatchPayload> {
    return this.getDelegate(db).deleteMany({
      where: {
        id,
        status: BacklogItemStatus.DRAFT,
      },
    });
  }

  createBacklogDocument(
    data: Prisma.ProgramBBacklogDocumentUncheckedCreateInput,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).programBBacklogDocument.create({
      data,
      select: backlogDocumentSelect,
    });
  }

  listBacklogDocuments(backlogItemId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).programBBacklogDocument.findMany({
      where: {
        backlogItemId,
        isActive: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: backlogDocumentSelect,
    });
  }

  findBacklogDocumentById(documentId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).programBBacklogDocument.findUnique({
      where: { id: documentId },
      select: {
        ...backlogDocumentSelect,
        backlogItemId: true,
      },
    });
  }
}

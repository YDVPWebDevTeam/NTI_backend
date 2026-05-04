import { Injectable } from '@nestjs/common';
import type {
  ApplicationDocument,
  Prisma,
} from '../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

export type ApplicationDocumentWithFile = Prisma.ApplicationDocumentGetPayload<{
  select: ReturnType<ApplicationDocumentsRepository['documentWithFileSelect']>;
}>;

@Injectable()
export class ApplicationDocumentsRepository extends BaseRepository<
  ApplicationDocument,
  Prisma.ApplicationDocumentUncheckedCreateInput,
  Prisma.ApplicationDocumentUncheckedUpdateInput,
  Prisma.ApplicationDocumentWhereInput,
  Prisma.ApplicationDocumentWhereUniqueInput,
  Prisma.ApplicationDocumentOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).applicationDocument;
  }

  findActiveBySlot(
    applicationId: string,
    documentType: Prisma.ApplicationDocumentUncheckedCreateInput['documentType'],
    documentScope: Prisma.ApplicationDocumentUncheckedCreateInput['documentScope'],
    memberUserId: string | null,
    db?: PrismaDbClient,
  ): Promise<ApplicationDocumentWithFile | null> {
    return (db ?? this.prisma.client).applicationDocument.findFirst({
      where: {
        applicationId,
        documentType,
        documentScope,
        memberUserId,
        isActive: true,
      },
      orderBy: {
        version: 'desc',
      },
      select: this.documentWithFileSelect(),
    });
  }

  findLatestVersionNumberBySlot(
    applicationId: string,
    documentType: Prisma.ApplicationDocumentUncheckedCreateInput['documentType'],
    documentScope: Prisma.ApplicationDocumentUncheckedCreateInput['documentScope'],
    memberUserId: string | null,
    db?: PrismaDbClient,
  ): Promise<{ version: number } | null> {
    return (db ?? this.prisma.client).applicationDocument.findFirst({
      where: {
        applicationId,
        documentType,
        documentScope,
        memberUserId,
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        version: true,
      },
    });
  }

  deactivateActiveBySlot(
    applicationId: string,
    documentType: Prisma.ApplicationDocumentUncheckedCreateInput['documentType'],
    documentScope: Prisma.ApplicationDocumentUncheckedCreateInput['documentScope'],
    memberUserId: string | null,
    db?: PrismaDbClient,
  ) {
    return this.updateMany(
      {
        applicationId,
        documentType,
        documentScope,
        memberUserId,
        isActive: true,
      },
      {
        isActive: false,
      },
      db,
    );
  }

  createVersioned(
    data: Prisma.ApplicationDocumentUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<ApplicationDocumentWithFile> {
    return (db ?? this.prisma.client).applicationDocument.create({
      data,
      select: this.documentWithFileSelect(),
    });
  }

  private documentWithFileSelect() {
    return {
      id: true,
      applicationId: true,
      uploadedFileId: true,
      documentType: true,
      documentScope: true,
      memberUserId: true,
      version: true,
      isActive: true,
      createdById: true,
      createdAt: true,
      uploadedFile: {
        select: {
          id: true,
          ownerId: true,
          key: true,
          originalName: true,
          mimeType: true,
          size: true,
          visibility: true,
          status: true,
          uploadedAt: true,
        },
      },
    } as const;
  }
}

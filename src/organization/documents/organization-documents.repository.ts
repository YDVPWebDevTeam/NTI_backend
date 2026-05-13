import { Injectable } from '@nestjs/common';
import {
  OrganizationDocument,
  Prisma,
  PrismaClient,
} from 'generated/prisma/client';
import {
  BaseRepository,
  PrismaDbClient,
  PrismaService,
} from '../../infrastructure/database';

type OrganizationDocumentDelegate = PrismaClient['organizationDocument'];

@Injectable()
export class OrganizationDocumentsRepository extends BaseRepository<
  OrganizationDocument,
  Prisma.OrganizationDocumentUncheckedCreateInput,
  Prisma.OrganizationDocumentUncheckedUpdateInput,
  Prisma.OrganizationDocumentWhereInput,
  Prisma.OrganizationDocumentWhereUniqueInput,
  Prisma.OrganizationDocumentOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient): OrganizationDocumentDelegate {
    return (db ?? this.prisma.client).organizationDocument;
  }

  findLatestVersionByName(
    organizationId: string,
    name: string,
    db?: PrismaDbClient,
  ): Promise<OrganizationDocument | null> {
    return this.getDelegate(db).findFirst({
      where: {
        organizationId,
        name,
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findByIdAndOrganization(
    id: string,
    organizationId: string,
    db?: PrismaDbClient,
  ): Promise<OrganizationDocument | null> {
    return this.findFirst(
      {
        id,
        organizationId,
      },
      db,
    );
  }

  listByOrganization(
    organizationId: string,
    db?: PrismaDbClient,
  ): Promise<OrganizationDocument[]> {
    return this.findMany(
      {
        where: {
          organizationId,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      },
      db,
    );
  }
}

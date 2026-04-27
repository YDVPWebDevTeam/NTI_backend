import { Injectable } from '@nestjs/common';
import type { ApplicationSection, Prisma } from '../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Injectable()
export class ApplicationSectionsRepository extends BaseRepository<
  ApplicationSection,
  Prisma.ApplicationSectionUncheckedCreateInput,
  Prisma.ApplicationSectionUncheckedUpdateInput,
  Prisma.ApplicationSectionWhereInput,
  Prisma.ApplicationSectionWhereUniqueInput,
  Prisma.ApplicationSectionOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).applicationSection;
  }

  findByApplicationId(
    applicationId: string,
    db?: PrismaDbClient,
  ): Promise<ApplicationSection[]> {
    return (db ?? this.prisma.client).applicationSection.findMany({
      where: { applicationId },
      orderBy: [{ key: 'asc' }],
    });
  }

  findByApplicationIdAndKey(
    applicationId: string,
    key: string,
    db?: PrismaDbClient,
  ): Promise<ApplicationSection | null> {
    return (db ?? this.prisma.client).applicationSection.findUnique({
      where: {
        applicationId_key: {
          applicationId,
          key,
        },
      },
    });
  }

  upsertSection(
    applicationId: string,
    key: string,
    valueJson: Prisma.InputJsonValue,
    updatedById: string,
    db?: PrismaDbClient,
  ): Promise<ApplicationSection> {
    return (db ?? this.prisma.client).applicationSection.upsert({
      where: {
        applicationId_key: {
          applicationId,
          key,
        },
      },
      create: {
        applicationId,
        key,
        valueJson,
        updatedById,
      },
      update: {
        valueJson,
        updatedById,
        version: {
          increment: 1,
        },
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import type {
  ApplicationSection,
  ApplicationSectionHistory,
  Prisma,
} from '../../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database/prisma.service';

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

  createHistoryEntry(
    sectionId: string,
    version: number,
    valueJson: Prisma.InputJsonValue,
    savedById: string,
    db?: PrismaDbClient,
  ): Promise<ApplicationSectionHistory> {
    return (db ?? this.prisma.client).applicationSectionHistory.create({
      data: {
        sectionId,
        version,
        valueJson,
        savedById,
      },
    });
  }

  findHistoryBySectionId(
    sectionId: string,
    db?: PrismaDbClient,
  ): Promise<ApplicationSectionHistory[]> {
    return (db ?? this.prisma.client).applicationSectionHistory.findMany({
      where: { sectionId },
      orderBy: { version: 'desc' },
    });
  }

  findHistoryEntriesBulk(
    pairs: { sectionId: string; version: number }[],
    db?: PrismaDbClient,
  ): Promise<ApplicationSectionHistory[]> {
    if (pairs.length === 0) return Promise.resolve([]);
    return (db ?? this.prisma.client).applicationSectionHistory.findMany({
      where: {
        OR: pairs.map(({ sectionId, version }) => ({ sectionId, version })),
      },
    });
  }

  findHistoryEntry(
    sectionId: string,
    version: number,
    db?: PrismaDbClient,
  ): Promise<ApplicationSectionHistory | null> {
    return (db ?? this.prisma.client).applicationSectionHistory.findUnique({
      where: {
        sectionId_version: {
          sectionId,
          version,
        },
      },
    });
  }

  setActiveVersion(
    sectionId: string,
    version: number | null,
    db?: PrismaDbClient,
  ): Promise<ApplicationSection> {
    return (db ?? this.prisma.client).applicationSection.update({
      where: { id: sectionId },
      data: { activeVersion: version },
    });
  }
}

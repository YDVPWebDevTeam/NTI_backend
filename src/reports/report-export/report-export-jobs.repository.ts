import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const reportExportJobSelect = {
  id: true,
  requestedByUserId: true,
  dataset: true,
  format: true,
  status: true,
  createdAt: true,
  completedAt: true,
  errorMessage: true,
  uploadedFileId: true,
  downloadTokenHash: true,
  downloadTokenExpiresAt: true,
} satisfies Prisma.ReportExportJobSelect;

export type ReportExportJobRecord = Prisma.ReportExportJobGetPayload<{
  select: typeof reportExportJobSelect;
}>;

@Injectable()
export class ReportExportJobsRepository extends BaseRepository<
  Prisma.ReportExportJobGetPayload<Record<string, never>>,
  Prisma.ReportExportJobUncheckedCreateInput,
  Prisma.ReportExportJobUncheckedUpdateInput,
  Prisma.ReportExportJobWhereInput,
  Prisma.ReportExportJobWhereUniqueInput,
  Prisma.ReportExportJobOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).reportExportJob;
  }

  findSelectedById(
    id: string,
    db?: PrismaDbClient,
  ): Promise<ReportExportJobRecord | null> {
    return (db ?? this.prisma.client).reportExportJob.findUnique({
      where: { id },
      select: reportExportJobSelect,
    });
  }

  findSelectedByIdForOwner(
    id: string,
    requestedByUserId: string,
    db?: PrismaDbClient,
  ): Promise<ReportExportJobRecord | null> {
    return (db ?? this.prisma.client).reportExportJob.findFirst({
      where: {
        id,
        requestedByUserId,
      },
      select: reportExportJobSelect,
    });
  }
}

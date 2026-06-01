import { Injectable } from '@nestjs/common';
import {
  ApplicationStatus,
  NeedsInfoItemStatus,
} from '../../../generated/prisma/enums';
import { PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class NeedsInfoRepository {
  constructor(private readonly prisma: PrismaService) {}

  createItem(
    data: {
      applicationId: string;
      message: string;
      dueAt?: Date | null;
      createdById: string;
    },
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).needsInfoItem.create({
      data: {
        applicationId: data.applicationId,
        message: data.message,
        dueAt: data.dueAt ?? null,
        createdById: data.createdById,
      },
    });
  }

  findItemForApplication(
    applicationId: string,
    itemId: string,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).needsInfoItem.findFirst({
      where: {
        id: itemId,
        applicationId,
      },
      include: {
        replies: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  createReply(
    data: {
      needsInfoItemId: string;
      message: string;
      createdById: string;
    },
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).needsInfoReply.create({
      data: {
        needsInfoItemId: data.needsInfoItemId,
        message: data.message,
        createdById: data.createdById,
      },
    });
  }

  markItemAnswered(itemId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).needsInfoItem.update({
      where: {
        id: itemId,
      },
      data: {
        status: NeedsInfoItemStatus.ANSWERED,
      },
    });
  }

  findUnresolvedItems(applicationId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).needsInfoItem.findMany({
      where: {
        applicationId,
        status: {
          in: [NeedsInfoItemStatus.OPEN, NeedsInfoItemStatus.ANSWERED],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  resolveAnsweredItems(
    applicationId: string,
    resolvedById: string,
    resolvedAt: Date,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).needsInfoItem.updateMany({
      where: {
        applicationId,
        status: NeedsInfoItemStatus.ANSWERED,
      },
      data: {
        status: NeedsInfoItemStatus.RESOLVED,
        resolvedById,
        resolvedAt,
      },
    });
  }

  getThread(applicationId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).needsInfoItem.findMany({
      where: {
        applicationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        replies: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  createStatusEvent(
    data: {
      applicationId: string;
      fromStatus: ApplicationStatus;
      toStatus: ApplicationStatus;
      changedById: string;
      reason?: string | null;
      needsInfoItemId?: string | null;
    },
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).applicationStatusEvent.create({
      data: {
        applicationId: data.applicationId,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        changedById: data.changedById,
        reason: data.reason ?? null,
        needsInfoItemId: data.needsInfoItemId ?? null,
      },
    });
  }

  getStatusEvents(applicationId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).applicationStatusEvent.findMany({
      where: {
        applicationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}

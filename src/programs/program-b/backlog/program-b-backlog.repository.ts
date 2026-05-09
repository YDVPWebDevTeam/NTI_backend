import { Injectable } from '@nestjs/common';
import { BacklogItem, Prisma, PrismaClient } from 'generated/prisma/client';
import { BacklogItemStatus } from 'generated/prisma/enums';
import {
  BaseRepository,
  PrismaDbClient,
  PrismaService,
} from '../../../infrastructure/database';

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
}

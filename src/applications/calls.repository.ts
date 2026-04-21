import { Injectable } from '@nestjs/common';
import type { Call, Prisma } from '../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Injectable()
export class CallsRepository extends BaseRepository<
  Call,
  Prisma.CallUncheckedCreateInput,
  Prisma.CallUncheckedUpdateInput,
  Prisma.CallWhereInput,
  Prisma.CallWhereUniqueInput,
  Prisma.CallOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).call;
  }

  findById(id: string, db?: PrismaDbClient): Promise<Call | null> {
    return (db ?? this.prisma.client).call.findUnique({
      where: { id },
    });
  }
}

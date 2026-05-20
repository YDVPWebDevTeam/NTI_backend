import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

const auditEventWithActorSelect = {
  id: true,
  actorUserId: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  actorUser: {
    select: {
      id: true,
      email: true,
    },
  },
} satisfies Prisma.AuditEventSelect;

export type AuditEventWithActor = Prisma.AuditEventGetPayload<{
  select: typeof auditEventWithActorSelect;
}>;

@Injectable()
export class AuditRepository extends BaseRepository<
  Prisma.AuditEventGetPayload<Record<string, never>>,
  Prisma.AuditEventUncheckedCreateInput,
  Prisma.AuditEventUncheckedUpdateInput,
  Prisma.AuditEventWhereInput,
  Prisma.AuditEventWhereUniqueInput,
  Prisma.AuditEventOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).auditEvent;
  }

  findManyWithActor(
    args: {
      where?: Prisma.AuditEventWhereInput;
      orderBy?: Prisma.AuditEventOrderByWithRelationInput[];
      skip?: number;
      take?: number;
    },
    db?: PrismaDbClient,
  ): Promise<AuditEventWithActor[]> {
    return (db ?? this.prisma.client).auditEvent.findMany({
      where: args.where,
      orderBy: args.orderBy,
      skip: args.skip,
      take: args.take,
      select: auditEventWithActorSelect,
    });
  }
}

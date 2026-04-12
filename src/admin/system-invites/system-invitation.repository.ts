import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  SystemInvitation,
} from '../../../generated/prisma/client';
import {
  SystemInvitationStatus,
  UserRole,
} from '../../../generated/prisma/enums';
import { BaseRepository, PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class SystemInvitationRepository extends BaseRepository<
  SystemInvitation,
  Prisma.SystemInvitationUncheckedCreateInput,
  Prisma.SystemInvitationUncheckedUpdateInput,
  Prisma.SystemInvitationWhereInput,
  Prisma.SystemInvitationWhereUniqueInput,
  Prisma.SystemInvitationOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).systemInvitation;
  }

  findActiveByEmailAndRole(
    email: string,
    roleToAssign: UserRole,
    now = new Date(),
    db?: PrismaDbClient,
  ): Promise<SystemInvitation | null> {
    return this.findFirst(
      {
        email,
        roleToAssign,
        status: SystemInvitationStatus.PENDING,
        expiresAt: { gt: now },
      },
      db,
    );
  }
}

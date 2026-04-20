import { Injectable } from '@nestjs/common';
import type { OrgInvitation, Prisma } from '../../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class OrgInvitationRepository extends BaseRepository<
  OrgInvitation,
  Prisma.OrgInvitationUncheckedCreateInput,
  Prisma.OrgInvitationUncheckedUpdateInput,
  Prisma.OrgInvitationWhereInput,
  Prisma.OrgInvitationWhereUniqueInput,
  Prisma.OrgInvitationOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).orgInvitation;
  }
}

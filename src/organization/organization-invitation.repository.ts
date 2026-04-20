import { Injectable } from '@nestjs/common';
import { OrgInvitation, Prisma, PrismaClient } from 'generated/prisma/client';
import { InvitationStatus } from 'generated/prisma/enums';
import {
  BaseRepository,
  PrismaDbClient,
  PrismaService,
} from 'src/infrastructure/database';

type OrgInvitationDelegate = PrismaClient['orgInvitation'];

@Injectable()
export class OrganizationInviteRepository extends BaseRepository<
  OrgInvitation,
  Prisma.OrgInvitationUncheckedCreateInput,
  Prisma.OrgInvitationUpdateInput,
  Prisma.OrgInvitationWhereInput,
  Prisma.OrgInvitationWhereUniqueInput,
  Prisma.OrgInvitationOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient): OrgInvitationDelegate {
    const client = db ?? this.prisma.client;
    return client.orgInvitation;
  }

  findActivePendingByEmailAndOrganization(
    email: string,
    organizationId: string,
    at: Date,
    db?: PrismaDbClient,
  ): Promise<OrgInvitation | null> {
    return (db ?? this.prisma.client).orgInvitation.findFirst({
      where: {
        email,
        organizationId,
        status: InvitationStatus.PENDING,
        revokedAt: null,
        expiresAt: { gt: at },
      },
    });
  }
}

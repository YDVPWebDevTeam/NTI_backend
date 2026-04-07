import { Injectable } from '@nestjs/common';
import {
  InvitationStatus,
  OrgInvitation,
  Prisma,
  PrismaClient,
} from 'generated/prisma/client';
import {
  BaseRepository,
  PrismaDbClient,
  PrismaService,
} from 'src/infrastructure/database';

@Injectable()
export class OrganizationInvitationRepository extends BaseRepository<
  OrgInvitation,
  Prisma.OrgInvitationCreateInput,
  Prisma.OrgInvitationUpdateInput,
  Prisma.OrgInvitationWhereInput,
  Prisma.OrgInvitationWhereUniqueInput,
  Prisma.OrgInvitationOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient): PrismaClient['orgInvitation'] {
    const client = db ?? this.prisma.client;
    return client.orgInvitation;
  }

  findActiveInvite(email: string, organizationId: string) {
    return this.findFirst({
      email,
      organizationId,
      status: InvitationStatus.PENDING,
      expiresAt: {
        gt: new Date(),
      },
    });
  }
}

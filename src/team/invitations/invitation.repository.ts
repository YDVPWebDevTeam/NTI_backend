import { Injectable } from '@nestjs/common';
import type { Invitation, Prisma } from '../../../generated/prisma/client';
import { InvitationStatus } from '../../../generated/prisma/enums';
import { BaseRepository, PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class InvitationRepository extends BaseRepository<
  Invitation,
  Prisma.InvitationUncheckedCreateInput,
  Prisma.InvitationUncheckedUpdateInput,
  Prisma.InvitationWhereInput,
  Prisma.InvitationWhereUniqueInput,
  Prisma.InvitationOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).invitation;
  }

  create(
    data: Prisma.InvitationUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<Invitation> {
    return (db ?? this.prisma.client).invitation.create({ data });
  }

  findById(id: string, db?: PrismaDbClient): Promise<Invitation | null> {
    return this.findUnique({ id }, db);
  }

  findByToken(token: string, db?: PrismaDbClient): Promise<Invitation | null> {
    return this.findUnique({ token }, db);
  }

  findActiveByEmailAndTeam(
    email: string,
    teamId: string,
    now = new Date(),
    db?: PrismaDbClient,
  ): Promise<Invitation | null> {
    return (db ?? this.prisma.client).invitation.findFirst({
      where: {
        email,
        teamId,
        status: InvitationStatus.PENDING,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });
  }

  findActiveInvitationEmails(
    teamId: string,
    emails: string[],
    now = new Date(),
    db?: PrismaDbClient,
  ): Promise<Array<{ email: string }>> {
    return (db ?? this.prisma.client).invitation.findMany({
      where: {
        teamId,
        email: { in: emails },
        status: InvitationStatus.PENDING,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: { email: true },
    });
  }

  findExistingMemberEmails(
    teamId: string,
    emails: string[],
    db?: PrismaDbClient,
  ): Promise<Array<{ user: { email: string } }>> {
    return (db ?? this.prisma.client).teamMember.findMany({
      where: {
        teamId,
        user: {
          email: { in: emails },
        },
      },
      select: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  revokeById(
    id: string,
    revokedAt = new Date(),
    db?: PrismaDbClient,
  ): Promise<Invitation> {
    return (db ?? this.prisma.client).invitation.update({
      where: { id },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt,
      },
    });
  }

  markAccepted(id: string, db?: PrismaDbClient): Promise<Invitation> {
    return (db ?? this.prisma.client).invitation.update({
      where: { id },
      data: {
        status: InvitationStatus.ACCEPTED,
      },
    });
  }

  revokeInvitations(
    invitationIds: string[],
    revokedAt = new Date(),
    db?: PrismaDbClient,
  ): Promise<Prisma.BatchPayload> {
    return (db ?? this.prisma.client).invitation.updateMany({
      where: {
        id: { in: invitationIds },
      },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt,
      },
    });
  }
}

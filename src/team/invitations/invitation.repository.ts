import { Injectable } from '@nestjs/common';
import type {
  Invitation,
  Prisma,
  Team,
} from '../../../generated/prisma/client';
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

  findByTokenWithTeam(
    token: string,
    db?: PrismaDbClient,
  ): Promise<InvitationWithTeam | null> {
    return (db ?? this.prisma.client).invitation.findUnique({
      where: { token },
      include: { team: true },
    });
  }

  create(
    data: Prisma.InvitationUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<Invitation> {
    return (db ?? this.prisma.client).invitation.create({ data });
  }

  createMany(
    data: Prisma.InvitationUncheckedCreateInput[],
    db?: PrismaDbClient,
  ): Promise<Prisma.BatchPayload> {
    return (db ?? this.prisma.client).invitation.createMany({ data });
  }

  findByTokens(tokens: string[], db?: PrismaDbClient): Promise<Invitation[]> {
    return (db ?? this.prisma.client).invitation.findMany({
      where: {
        token: {
          in: tokens,
        },
      },
    });
  }

  findById(id: string, db?: PrismaDbClient): Promise<Invitation | null> {
    return this.findUnique({ id }, db);
  }

  findByToken(token: string, db?: PrismaDbClient): Promise<Invitation | null> {
    return this.findUnique({ token }, db);
  }

  findActiveInvitationEmails(
    teamId: string,
    emails: string[],
    at: Date,
    db?: PrismaDbClient,
  ): Promise<Array<{ email: string }>> {
    return (db ?? this.prisma.client).invitation.findMany({
      where: {
        teamId,
        email: { in: emails },
        status: InvitationStatus.PENDING,
        revokedAt: null,
        expiresAt: { gt: at },
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

  revokePendingById(
    id: string,
    at: Date,
    db?: PrismaDbClient,
  ): Promise<Prisma.BatchPayload> {
    return (db ?? this.prisma.client).invitation.updateMany({
      where: {
        id,
        status: InvitationStatus.PENDING,
        revokedAt: null,
        expiresAt: { gt: at },
      },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: at,
      },
    });
  }

  markAcceptedIfPending(
    id: string,
    email: string,
    at: Date,
    db?: PrismaDbClient,
  ): Promise<Prisma.BatchPayload> {
    return (db ?? this.prisma.client).invitation.updateMany({
      where: {
        id,
        email,
        status: InvitationStatus.PENDING,
        revokedAt: null,
        expiresAt: { gt: at },
      },
      data: {
        status: InvitationStatus.ACCEPTED,
      },
    });
  }

  revokeInvitations(
    invitationIds: string[],
    revokedAt: Date,
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

export type InvitationWithTeam = Invitation & { team: Team };

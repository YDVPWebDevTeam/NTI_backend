import { Injectable } from '@nestjs/common';
import type {
  Invitation,
  Prisma,
  Team,
  TeamMember,
} from '../../generated/prisma/client';
import { InvitationStatus } from '../../generated/prisma/enums';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Injectable()
export class TeamRepository extends BaseRepository<
  Team,
  Prisma.TeamUncheckedCreateInput,
  Prisma.TeamUncheckedUpdateInput,
  Prisma.TeamWhereInput,
  Prisma.TeamWhereUniqueInput,
  Prisma.TeamOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).team;
  }

  createInvitation(
    data: Prisma.InvitationUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<Invitation> {
    return (db ?? this.prisma.client).invitation.create({ data });
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

  findMembership(
    teamId: string,
    userId: string,
    db?: PrismaDbClient,
  ): Promise<TeamMember | null> {
    return (db ?? this.prisma.client).teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
  }

  deleteMembership(
    teamId: string,
    userId: string,
    db?: PrismaDbClient,
  ): Promise<TeamMember> {
    return (db ?? this.prisma.client).teamMember.delete({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
  }

  updateLeader(
    teamId: string,
    leaderId: string,
    db?: PrismaDbClient,
  ): Promise<Team> {
    return this.update(
      { id: teamId },
      {
        leaderId,
      },
      db,
    );
  }
}

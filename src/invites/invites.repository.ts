import { Injectable } from '@nestjs/common';
import type { Invitation, Prisma, Team } from '../../generated/prisma/client';
import { InvitationStatus } from '../../generated/prisma/enums';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

export type InvitationWithTeam = Invitation & { team: Team };

@Injectable()
export class InvitesRepository extends BaseRepository<
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

  markAccepted(id: string, db?: PrismaDbClient): Promise<Invitation> {
    return this.update(
      { id },
      {
        status: InvitationStatus.ACCEPTED,
      },
      db,
    );
  }

  createTeamMember(
    userId: string,
    teamId: string,
    db?: PrismaDbClient,
  ): Promise<{ userId: string; teamId: string }> {
    return (db ?? this.prisma.client).teamMember.create({
      data: {
        userId,
        teamId,
      },
    });
  }
}

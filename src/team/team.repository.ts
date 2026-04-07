import { Injectable } from '@nestjs/common';
import type { Prisma, Team, TeamMember } from '../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

export type TeamWithRelations = Prisma.TeamGetPayload<{
  select: ReturnType<TeamRepository['teamRelationsSelect']>;
}>;

export type TeamPublicView = Pick<
  Team,
  | 'id'
  | 'name'
  | 'leaderId'
  | 'createdAt'
  | 'updatedAt'
  | 'lockedAt'
  | 'archivedAt'
>;

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

  create(
    data: Prisma.TeamUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<TeamWithRelations> {
    return (db ?? this.prisma.client).team.create({
      data,
      select: this.teamRelationsSelect(),
    });
  }

  findById(id: string, db?: PrismaDbClient): Promise<TeamWithRelations | null> {
    return (db ?? this.prisma.client).team.findUnique({
      where: { id },
      select: this.teamRelationsSelect(),
    });
  }

  findPublicById(
    id: string,
    db?: PrismaDbClient,
  ): Promise<TeamPublicView | null> {
    return (db ?? this.prisma.client).team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        leaderId: true,
        createdAt: true,
        updatedAt: true,
        lockedAt: true,
        archivedAt: true,
      },
    });
  }

  update(
    where: Prisma.TeamWhereUniqueInput,
    data: Prisma.TeamUncheckedUpdateInput,
    db?: PrismaDbClient,
  ): Promise<TeamWithRelations> {
    return (db ?? this.prisma.client).team.update({
      where,
      data,
      select: this.teamRelationsSelect(),
    });
  }

  remove(
    where: Prisma.TeamWhereUniqueInput,
    db?: PrismaDbClient,
  ): Promise<Team> {
    return (db ?? this.prisma.client).team.delete({
      where,
    });
  }

  addMember(
    teamId: string,
    userId: string,
    db?: PrismaDbClient,
  ): Promise<TeamMember> {
    return (db ?? this.prisma.client).teamMember.create({
      data: {
        teamId,
        userId,
      },
    });
  }

  findMember(
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

  private teamRelationsSelect() {
    return {
      id: true,
      name: true,
      leaderId: true,
      createdAt: true,
      updatedAt: true,
      lockedAt: true,
      archivedAt: true,
      leader: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          isEmailConfirmed: true,
          isAdminConfirmed: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      members: {
        select: {
          userId: true,
          teamId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              isEmailConfirmed: true,
              isAdminConfirmed: true,
              organizationId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    } as const;
  }
}

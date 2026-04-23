import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Team } from '../../generated/prisma/client';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import type { PrismaDbClient } from '../infrastructure/database';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { CreateTeamWithInvitesDto } from './dto/create-team-with-invites.dto';
import { LeaveTeamResponseDto } from './dto/leave-team-response.dto';
import { RemoveTeamMemberResponseDto } from './dto/remove-team-member-response.dto';
import { TeamSummaryResponseDto } from './dto/team-summary-response.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreatedInvitationDto } from './invitations/dto/created-invitation.dto';
import { InvitationService } from './invitations/invitation.service';
import {
  TeamPublicView,
  TeamRepository,
  TeamWithRelations,
} from './team.repository';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly invitationService: InvitationService,
    private readonly queueService: QueueService,
  ) {}

  async create(
    user: AuthenticatedUserContext,
    dto: CreateTeamWithInvitesDto,
  ): Promise<TeamWithRelations> {
    const team = await this.teamRepository.transaction(async (db) => {
      const createdTeam = await this.teamRepository.create(
        {
          name: dto.name,
          leaderId: user.id,
        },
        db,
      );

      await this.teamRepository.addMember(createdTeam.id, user.id, db);

      const loadedTeam = await this.teamRepository.findById(createdTeam.id, db);

      if (!loadedTeam) {
        throw new InternalServerErrorException('Failed to load created team');
      }

      return loadedTeam;
    });

    try {
      await this.createInvites(team, dto.emails, {
        minimumCreatedCount: 2,
      });
    } catch (error) {
      try {
        await this.teamRepository.remove({ id: team.id });
      } catch (cleanupError) {
        this.logger.error(
          `Failed to rollback team ${team.id} after invite creation failure`,
          cleanupError instanceof Error ? cleanupError.stack : undefined,
        );
      }
      throw error;
    }

    return team;
  }

  async findPublicById(id: string): Promise<TeamPublicView> {
    const team = await this.teamRepository.findPublicById(id);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async update(
    teamId: string,
    requesterId: string,
    dto: UpdateTeamDto,
  ): Promise<TeamWithRelations> {
    const team = await this.findByIdOrThrow(teamId);

    if (team.leaderId !== requesterId) {
      throw new ForbiddenException();
    }

    if (team.lockedAt) {
      throw new ConflictException('Team is locked');
    }

    if (Object.keys(dto).length === 0) {
      return team;
    }

    return this.teamRepository.update({ id: teamId }, dto);
  }

  async remove(teamId: string): Promise<Team> {
    await this.findByIdOrThrow(teamId);
    return this.teamRepository.remove({ id: teamId });
  }

  async createInvites(
    team: Pick<Team, 'id' | 'name' | 'lockedAt'>,
    emails: string[],
    options?: {
      minimumCreatedCount?: number;
    },
  ): Promise<{ createdCount: number; invitations: CreatedInvitationDto[] }> {
    if (team.lockedAt) {
      throw new ConflictException('Team is locked');
    }

    const invitations = await this.invitationService.createInvites(
      team.id,
      emails,
    );
    const minimumCreatedCount = options?.minimumCreatedCount ?? 0;

    if (invitations.length < minimumCreatedCount) {
      if (invitations.length > 0) {
        await this.invitationService.revokeInvitations(
          invitations.map(({ id }) => id),
        );
      }

      throw new ConflictException(
        `At least ${minimumCreatedCount} invitations must be created`,
      );
    }

    const queuedJobIds: string[] = [];

    try {
      for (const invitation of invitations) {
        const jobId = `team-invitation:${invitation.id}`;

        await this.queueService.addEmail(
          EMAIL_JOBS.TEAM_INVITATION,
          {
            email: invitation.email,
            teamName: team.name,
            token: invitation.token,
          },
          { jobId },
        );

        queuedJobIds.push(jobId);
      }
    } catch {
      await Promise.allSettled(
        queuedJobIds.map((jobId) => this.queueService.removeEmailJob(jobId)),
      );
      await this.invitationService.revokeInvitations(
        invitations.map(({ id }) => id),
      );
      throw new InternalServerErrorException(
        'Failed to enqueue invitation emails',
      );
    }

    return {
      createdCount: invitations.length,
      invitations: invitations.map(({ id, email }) => ({ id, email })),
    };
  }

  async removeMember(
    teamId: string,
    actorId: string,
    memberId: string,
  ): Promise<RemoveTeamMemberResponseDto> {
    return this.teamRepository.transaction(async (db) => {
      const team = await this.getTeamOrThrow(teamId, db);

      this.ensureTeamLeader(team, actorId);
      this.ensureTeamIsUnlocked(team);

      if (memberId === team.leaderId) {
        throw new ConflictException('Cannot remove current team leader');
      }

      const membership = await this.teamRepository.findMember(
        team.id,
        memberId,
        db,
      );

      if (!membership) {
        throw new NotFoundException('Team member not found');
      }

      const deletedMembership = await this.teamRepository.deleteMembership(
        team.id,
        memberId,
        db,
      );

      if (deletedMembership.count === 0) {
        throw new NotFoundException('Team member not found');
      }

      return {
        teamId: team.id,
        memberId,
        removed: true,
      };
    });
  }

  async leaveTeam(
    teamId: string,
    actorId: string,
  ): Promise<LeaveTeamResponseDto> {
    return this.teamRepository.transaction(async (db) => {
      const team = await this.getTeamOrThrow(teamId, db);

      this.ensureTeamIsUnlocked(team);

      const membership = await this.teamRepository.findMember(
        team.id,
        actorId,
        db,
      );

      if (!membership) {
        throw new NotFoundException('Team member not found');
      }

      if (actorId === team.leaderId) {
        throw new ConflictException(
          'Current team leader must transfer leadership before leaving team',
        );
      }

      const deletedMembership = await this.teamRepository.deleteMembership(
        team.id,
        actorId,
        db,
      );

      if (deletedMembership.count === 0) {
        throw new NotFoundException('Team member not found');
      }

      return {
        teamId: team.id,
        userId: actorId,
        left: true,
      };
    });
  }

  async transferLeadership(
    teamId: string,
    actorId: string,
    newLeaderId: string,
  ): Promise<TeamSummaryResponseDto> {
    const updatedTeam = await this.teamRepository.transaction(async (db) => {
      const team = await this.getTeamOrThrow(teamId, db);

      this.ensureTeamLeader(team, actorId);
      this.ensureTeamIsUnlocked(team);

      const newLeaderMembership = await this.teamRepository.findMember(
        team.id,
        newLeaderId,
        db,
      );

      if (!newLeaderMembership) {
        throw new NotFoundException('Team member not found');
      }

      return this.teamRepository.updateLeader(team.id, newLeaderId, db);
    });

    return {
      id: updatedTeam.id,
      leaderId: updatedTeam.leaderId,
      updatedAt: updatedTeam.updatedAt,
    };
  }

  private async findByIdOrThrow(id: string): Promise<TeamWithRelations> {
    const team = await this.teamRepository.findById(id);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  private async getTeamOrThrow(
    teamId: string,
    db?: PrismaDbClient,
  ): Promise<Team> {
    const team = await this.teamRepository.findUnique({ id: teamId }, db);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  private ensureTeamLeader(team: Team, actorId: string): void {
    if (team.leaderId !== actorId) {
      throw new ForbiddenException();
    }
  }

  private ensureTeamIsUnlocked(team: Team): void {
    if (team.lockedAt) {
      throw new ConflictException('Team is locked');
    }
  }
}

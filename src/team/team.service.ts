import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Invitation, Team } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import { EligibilitySignalsService } from '../applications/eligibility-signals.service';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import type {
  PrismaDbClient,
  PrismaTransactionOptions,
} from '../infrastructure/database';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { CreateTeamWithInvitesDto } from './dto/create-team-with-invites.dto';
import { LeaveTeamResponseDto } from './dto/leave-team-response.dto';
import { RemoveTeamMemberResponseDto } from './dto/remove-team-member-response.dto';
import { TeamDetailDto } from './dto/team-detail.dto';
import { TeamSummaryResponseDto } from './dto/team-summary-response.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreatedInvitationDto } from './invitations/dto/created-invitation.dto';
import { InvitationService } from './invitations/invitation.service';
import {
  TeamPublicView,
  TeamRepository,
  TeamWithRelations,
} from './team.repository';

type TeamInvitationEmailPayload = Pick<Invitation, 'id' | 'email' | 'token'>;

@Injectable()
export class TeamService {
  private readonly membershipLifecycleTransactionOptions: PrismaTransactionOptions =
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    };

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly invitationService: InvitationService,
    private readonly queueService: QueueService,
    private readonly eligibilitySignalsService: EligibilitySignalsService,
  ) {}

  async create(
    user: AuthenticatedUserContext,
    dto: CreateTeamWithInvitesDto,
  ): Promise<TeamDetailDto> {
    const minimumCreatedCount = 2;

    const { team, invitations } = await this.teamRepository.transaction(
      async (db) => {
        const createdTeam = await this.teamRepository.create(
          {
            name: dto.name,
            leaderId: user.id,
          },
          db,
        );

        await this.teamRepository.addMember(createdTeam.id, user.id, db);

        const loadedTeam = await this.teamRepository.findById(
          createdTeam.id,
          db,
        );

        if (!loadedTeam) {
          throw new InternalServerErrorException('Failed to load created team');
        }

        const createdInvitations = await this.invitationService.createInvites(
          createdTeam.id,
          dto.emails,
          db,
        );

        if (createdInvitations.length < minimumCreatedCount) {
          throw new ConflictException(
            `At least ${minimumCreatedCount} invitations must be created`,
          );
        }

        return {
          team: loadedTeam,
          invitations: createdInvitations,
        };
      },
    );

    await this.enqueueInvitationEmailsOrRevoke(team, invitations);

    return this.toTeamDetail(team);
  }

  async ensurePersonalTeamForUser(
    user: AuthenticatedUserContext,
    teamName: string,
  ): Promise<TeamDetailDto> {
    const ensuredTeam = await this.runMembershipLifecycleTransaction(
      async (db) => {
        const existingTeams = await this.teamRepository.findActiveByUserId(
          user.id,
          db,
        );

        if (existingTeams.length === 1) {
          const [existingTeam] = existingTeams;

          if (this.shouldRenamePersonalTeam(existingTeam, user.id, teamName)) {
            return this.teamRepository.update(
              { id: existingTeam.id },
              { name: teamName },
              db,
            );
          }

          return existingTeam;
        }

        if (existingTeams.length > 1) {
          throw new ConflictException(
            'Multiple active teams found for current user',
          );
        }

        const createdTeam = await this.teamRepository.create(
          {
            name: teamName,
            leaderId: user.id,
          },
          db,
        );

        await this.teamRepository.addMember(createdTeam.id, user.id, db);

        const loadedTeam = await this.teamRepository.findById(
          createdTeam.id,
          db,
        );

        if (!loadedTeam) {
          throw new InternalServerErrorException('Failed to load created team');
        }

        return loadedTeam;
      },
    );

    return this.toTeamDetail(ensuredTeam);
  }

  async findOne(id: string): Promise<Team | null> {
    return this.teamRepository.findUnique({ id });
  }

  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    const membership = await this.teamRepository.findMember(teamId, userId);
    return !!membership;
  }

  async ensureLeaderOwnedUnarchivedTeam(
    teamId: string,
    userId: string,
  ): Promise<Team> {
    const team = await this.teamRepository.findUnique({ id: teamId });

    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (team.leaderId !== userId) {
      throw new ForbiddenException('Only team leader can act on this team');
    }
    if (team.archivedAt) {
      throw new ConflictException('Archived team cannot be used');
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

  async findCurrentForUser(
    user: AuthenticatedUserContext,
  ): Promise<TeamDetailDto> {
    const teams = await this.teamRepository.findActiveByUserId(user.id);

    if (teams.length === 0) {
      throw new NotFoundException('Current team not found');
    }

    if (teams.length > 1) {
      throw new ConflictException(
        'Multiple active teams found for current user',
      );
    }

    return this.toTeamDetail(teams[0]);
  }

  async update(
    teamId: string,
    requesterId: string,
    dto: UpdateTeamDto,
  ): Promise<TeamDetailDto> {
    const team = await this.findByIdOrThrow(teamId);

    this.ensureTeamLeader(team, requesterId);
    this.ensureTeamIsUnlocked(team);

    if (Object.keys(dto).length === 0) {
      return this.toTeamDetail(team);
    }

    return this.toTeamDetail(
      await this.teamRepository.update({ id: teamId }, dto),
    );
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

    await this.enqueueInvitationEmailsOrRevoke(team, invitations);

    return {
      createdCount: invitations.length,
      invitations: invitations.map(({ id, email }) => ({ id, email })),
    };
  }

  private async enqueueInvitationEmailsOrRevoke(
    team: Pick<Team, 'id' | 'name'>,
    invitations: TeamInvitationEmailPayload[],
  ): Promise<void> {
    const queuedJobIds: string[] = [];

    try {
      for (const invitation of invitations) {
        const jobId = `team-invitation-${invitation.id}`;

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
  }

  async removeMember(
    teamId: string,
    actorId: string,
    memberId: string,
  ): Promise<RemoveTeamMemberResponseDto> {
    return this.runMembershipLifecycleTransaction(async (db) => {
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

      await this.eligibilitySignalsService.recomputeForTeamApplications(
        team.id,
        db,
      );

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
    return this.runMembershipLifecycleTransaction(async (db) => {
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

      await this.eligibilitySignalsService.recomputeForTeamApplications(
        team.id,
        db,
      );

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
    const updatedTeam = await this.runMembershipLifecycleTransaction(
      async (db) => {
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

        const updated = await this.teamRepository.updateLeader(
          team.id,
          newLeaderId,
          db,
        );

        await this.eligibilitySignalsService.recomputeForTeamApplications(
          team.id,
          db,
        );

        return updated;
      },
    );

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

  private toTeamDetail(team: TeamWithRelations): TeamDetailDto {
    return {
      id: team.id,
      name: team.name,
      leaderId: team.leaderId,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      lockedAt: team.lockedAt,
      archivedAt: team.archivedAt,
      leader: {
        id: team.leader.id,
        firstName: team.leader.firstName,
        lastName: team.leader.lastName,
        email: team.leader.email,
        role: team.leader.role,
        status: team.leader.status,
        isEmailConfirmed: team.leader.isEmailConfirmed,
        isAdminConfirmed: team.leader.isAdminConfirmed,
        organizationId: team.leader.organizationId,
        createdAt: team.leader.createdAt,
        updatedAt: team.leader.updatedAt,
      },
      members: team.members.map((member) => ({
        userId: member.userId,
        teamId: member.teamId,
        user: {
          id: member.user.id,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          email: member.user.email,
          role: member.user.role,
          status: member.user.status,
          isEmailConfirmed: member.user.isEmailConfirmed,
          isAdminConfirmed: member.user.isAdminConfirmed,
          organizationId: member.user.organizationId,
          createdAt: member.user.createdAt,
          updatedAt: member.user.updatedAt,
        },
      })),
    };
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

  private shouldRenamePersonalTeam(
    team: TeamWithRelations,
    userId: string,
    requestedName: string,
  ): boolean {
    return (
      team.name !== requestedName &&
      team.leaderId === userId &&
      team.members.length === 1 &&
      team.members[0]?.userId === userId
    );
  }

  private ensureTeamIsUnlocked(team: Team): void {
    if (team.lockedAt) {
      throw new ConflictException('Team is locked');
    }
  }

  private runMembershipLifecycleTransaction<T>(
    fn: (db: PrismaDbClient) => Promise<T>,
  ): Promise<T> {
    return this.teamRepository.transaction(
      fn,
      this.membershipLifecycleTransactionOptions,
    );
  }
}

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Invitation, Team } from '../../generated/prisma/client';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { CreateTeamWithInvitesDto } from './dto/create-team-with-invites.dto';
import { CreatedInvitationDto } from './invitations/dto/created-invitation.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { InvitationService } from './invitations/invitation.service';
import {
  TeamPublicView,
  TeamRepository,
  TeamWithRelations,
} from './team.repository';

type TeamInvitationEmailPayload = Pick<Invitation, 'id' | 'email' | 'token'>;

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

    await this.enqueueInvitationEmailsBestEffort(team.name, invitations);

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

    await this.enqueueInvitationEmailsOrRevoke(team, invitations);

    return {
      createdCount: invitations.length,
      invitations: invitations.map(({ id, email }) => ({ id, email })),
    };
  }

  private async enqueueInvitationEmailsBestEffort(
    teamName: string,
    invitations: TeamInvitationEmailPayload[],
  ): Promise<void> {
    const failedEmails: string[] = [];

    for (const invitation of invitations) {
      const jobId = `team-invitation:${invitation.id}`;

      try {
        await this.queueService.addEmail(
          EMAIL_JOBS.TEAM_INVITATION,
          {
            email: invitation.email,
            teamName,
            token: invitation.token,
          },
          { jobId },
        );
      } catch {
        failedEmails.push(invitation.email);
      }
    }

    if (failedEmails.length > 0) {
      this.logger.warn(
        `Failed to enqueue ${failedEmails.length} invitation emails for team "${teamName}"`,
      );
    }
  }

  private async enqueueInvitationEmailsOrRevoke(
    team: Pick<Team, 'id' | 'name'>,
    invitations: TeamInvitationEmailPayload[],
  ): Promise<void> {
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
  }

  private async findByIdOrThrow(id: string): Promise<TeamWithRelations> {
    const team = await this.teamRepository.findById(id);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }
}

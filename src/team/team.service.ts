import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Team } from '../../generated/prisma/client';
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

@Injectable()
export class TeamService {
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
      await this.teamRepository.remove({ id: team.id });
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
    team: Pick<Team, 'id' | 'name'>,
    emails: string[],
    options?: {
      minimumCreatedCount?: number;
    },
  ): Promise<{ createdCount: number; invitations: CreatedInvitationDto[] }> {
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

    try {
      await Promise.all(
        invitations.map((invitation) =>
          this.queueService.addEmail(EMAIL_JOBS.TEAM_INVITATION, {
            email: invitation.email,
            teamName: team.name,
            token: invitation.token,
          }),
        ),
      );
    } catch {
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

  private async findByIdOrThrow(id: string): Promise<TeamWithRelations> {
    const team = await this.teamRepository.findById(id);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }
}

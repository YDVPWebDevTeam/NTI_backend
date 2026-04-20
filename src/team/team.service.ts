import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { Invitation, Team } from '../../generated/prisma/client';
import { InvitationStatus } from '../../generated/prisma/enums';
import { ConfigService } from '../infrastructure/config';
import type { PrismaDbClient } from '../infrastructure/database';
import { HashingService } from '../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { LeaveTeamResponseDto } from './dto/leave-team-response.dto';
import { RemoveTeamMemberResponseDto } from './dto/remove-team-member-response.dto';
import { TeamSummaryResponseDto } from './dto/team-summary-response.dto';
import { TeamRepository } from './team.repository';

const INVITATION_TOKEN_MAX_RETRIES = 5;
const normalizeInviteEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class TeamService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {}

  async createInvites(
    team: Team,
    emails: string[],
  ): Promise<{ createdCount: number }> {
    const normalizedEmails = [...new Set(emails.map(normalizeInviteEmail))];

    const invitations = await this.teamRepository.transaction(async (db) => {
      const availableEmails = await this.filterInvitableEmails(
        team.id,
        normalizedEmails,
        db,
      );
      const createdInvitations: Invitation[] = [];

      for (const email of availableEmails) {
        createdInvitations.push(
          await this.createInvitation(team.id, email, db),
        );
      }

      return createdInvitations;
    });

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
      await this.teamRepository.revokeInvitations(
        invitations.map((invitation) => invitation.id),
      );
      throw new InternalServerErrorException(
        'Failed to enqueue invitation emails',
      );
    }

    return { createdCount: invitations.length };
  }

  async removeMember(
    teamId: string,
    actorId: string,
    memberId: string,
  ): Promise<RemoveTeamMemberResponseDto> {
    const team = await this.getTeamOrThrow(teamId);

    this.ensureTeamLeader(team, actorId);
    this.ensureTeamIsUnlocked(team);

    if (memberId === team.leaderId) {
      throw new ConflictException('Cannot remove current team leader');
    }

    const membership = await this.teamRepository.findMembership(
      team.id,
      memberId,
    );

    if (!membership) {
      throw new NotFoundException('Team member not found');
    }

    await this.teamRepository.deleteMembership(team.id, memberId);

    return {
      teamId: team.id,
      memberId,
      removed: true,
    };
  }

  async leaveTeam(
    teamId: string,
    actorId: string,
  ): Promise<LeaveTeamResponseDto> {
    const team = await this.getTeamOrThrow(teamId);

    this.ensureTeamIsUnlocked(team);

    const membership = await this.teamRepository.findMembership(
      team.id,
      actorId,
    );

    if (!membership) {
      throw new NotFoundException('Team member not found');
    }

    if (actorId === team.leaderId) {
      throw new ConflictException(
        'Current team leader must transfer leadership before leaving team',
      );
    }

    await this.teamRepository.deleteMembership(team.id, actorId);

    return {
      teamId: team.id,
      userId: actorId,
      left: true,
    };
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

      const newLeaderMembership = await this.teamRepository.findMembership(
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

  private async filterInvitableEmails(
    teamId: string,
    emails: string[],
    db: PrismaDbClient,
  ): Promise<string[]> {
    if (emails.length === 0) {
      return [];
    }

    const now = new Date();
    const [activeInvitations, existingMembers] = await Promise.all([
      this.teamRepository.findActiveInvitationEmails(teamId, emails, now, db),
      this.teamRepository.findExistingMemberEmails(teamId, emails, db),
    ]);

    const blockedEmails = new Set<string>([
      ...activeInvitations.map(({ email }) => email),
      ...existingMembers.map(({ user }) => user.email),
    ]);

    return emails.filter((email) => !blockedEmails.has(email));
  }

  private async createInvitation(
    teamId: string,
    email: string,
    db: PrismaDbClient,
  ): Promise<Invitation> {
    for (
      let attempt = 0;
      attempt < INVITATION_TOKEN_MAX_RETRIES;
      attempt += 1
    ) {
      try {
        return await this.teamRepository.createInvitation(
          {
            email,
            token: this.hashingService.generateHexToken(
              this.configService.tokenByteLength,
            ),
            status: InvitationStatus.PENDING,
            teamId,
            expiresAt: this.resolveExpirationDate(),
          },
          db,
        );
      } catch (error: unknown) {
        if (
          !this.isTokenUniqueConstraintError(error) ||
          attempt === INVITATION_TOKEN_MAX_RETRIES - 1
        ) {
          throw error;
        }
      }
    }

    throw new Error('Failed to create invitation');
  }

  private resolveExpirationDate(): Date {
    return new Date(
      Date.now() +
        this.configService.emailVerificationExpirationHours * 60 * 60 * 1000,
    );
  }

  private isTokenUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
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

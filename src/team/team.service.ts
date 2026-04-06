import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { Invitation, Team } from '../../generated/prisma/client';
import { InvitationStatus } from '../../generated/prisma/enums';
import { ConfigService } from '../infrastructure/config';
import type { PrismaDbClient } from '../infrastructure/database';
import { HashingService } from '../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
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
}

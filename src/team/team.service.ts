import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { Invitation, Team } from '../../generated/prisma/client';
import { InvitationStatus } from '../../generated/prisma/enums';
import { ConfigService } from '../infrastructure/config';
import type { PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { HashingService } from '../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {}

  async createInvites(
    team: Team,
    emails: string[],
  ): Promise<{ createdCount: number }> {
    const normalizedEmails = emails.map((email) => email.trim().toLowerCase());

    const invitations = await this.prisma.client.$transaction(async (db) => {
      const createdInvitations: Invitation[] = [];

      for (const email of normalizedEmails) {
        createdInvitations.push(
          await this.createInvitation(team.id, email, db),
        );
      }

      return createdInvitations;
    });

    await Promise.all(
      invitations.map((invitation) =>
        this.queueService.addEmail(EMAIL_JOBS.TEAM_INVITATION, {
          email: invitation.email,
          teamName: team.name,
          token: invitation.token,
        }),
      ),
    );

    return { createdCount: invitations.length };
  }

  private async createInvitation(
    teamId: string,
    email: string,
    db: PrismaDbClient,
  ): Promise<Invitation> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await db.invitation.create({
          data: {
            email,
            token: this.hashingService.generateHexToken(
              this.configService.tokenByteLength,
            ),
            status: InvitationStatus.PENDING,
            teamId,
            expiresAt: this.resolveExpirationDate(),
          },
        });
      } catch (error: unknown) {
        if (!this.isTokenUniqueConstraintError(error) || attempt === 4) {
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

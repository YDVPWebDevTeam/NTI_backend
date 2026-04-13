import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import type { Invitation, TeamMember } from '../../../generated/prisma/client';
import { InvitationStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { normalizeInviteEmail } from '../../common/validation/invite-email.validation';
import { ConfigService } from '../../infrastructure/config';
import type { PrismaDbClient } from '../../infrastructure/database';
import { HashingService } from '../../infrastructure/hashing';
import { TeamRepository } from '../team.repository';
import { InvitationRepository } from './invitation.repository';

const INVITATION_TOKEN_MAX_RETRIES = 5;

@Injectable()
export class InvitationService {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly teamRepository: TeamRepository,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
  ) {}

  async createInvites(teamId: string, emails: string[]): Promise<Invitation[]> {
    const normalizedEmails = [...new Set(emails.map(normalizeInviteEmail))];

    for (
      let attempt = 0;
      attempt < INVITATION_TOKEN_MAX_RETRIES;
      attempt += 1
    ) {
      try {
        return await this.invitationRepository.transaction(async (db) => {
          const availableEmails = await this.filterInvitableEmails(
            teamId,
            normalizedEmails,
            db,
          );

          if (availableEmails.length === 0) {
            return [];
          }

          const invitationsToCreate = this.buildInvitationsToCreate(
            teamId,
            availableEmails,
          );

          await this.invitationRepository.createMany(invitationsToCreate, db);

          const createdInvitations =
            await this.invitationRepository.findByTokens(
              invitationsToCreate.map(({ token }) => token),
              db,
            );

          const invitationByToken = new Map(
            createdInvitations.map((invitation) => [
              invitation.token,
              invitation,
            ]),
          );

          return invitationsToCreate
            .map(({ token }) => invitationByToken.get(token))
            .filter(
              (invitation): invitation is Invitation =>
                invitation !== undefined,
            );
        });
      } catch (error: unknown) {
        if (
          !this.isTokenUniqueConstraintError(error) ||
          attempt === INVITATION_TOKEN_MAX_RETRIES - 1
        ) {
          throw error;
        }
      }
    }

    throw new Error('Failed to create invitations');
  }

  async revoke(
    teamId: string,
    invitationId: string,
    db?: PrismaDbClient,
  ): Promise<Invitation> {
    const invitation = await this.invitationRepository.findById(
      invitationId,
      db,
    );

    if (!invitation || invitation.teamId !== teamId) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ConflictException('Invitation is not active');
    }

    return this.invitationRepository.revokeById(invitation.id, new Date(), db);
  }

  async accept(
    token: string,
    user: Pick<AuthenticatedUserContext, 'id' | 'email'>,
  ): Promise<TeamMember> {
    return this.invitationRepository.transaction(async (db) => {
      const invitation = await this.invitationRepository.findByToken(token, db);

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.status === InvitationStatus.ACCEPTED) {
        throw new ConflictException('Invitation already accepted');
      }

      if (
        invitation.status === InvitationStatus.REVOKED ||
        invitation.revokedAt !== null ||
        invitation.expiresAt <= new Date()
      ) {
        throw new GoneException('Invitation expired or revoked');
      }

      if (invitation.email !== user.email) {
        throw new ForbiddenException(
          'Invitation token does not belong to the authenticated user',
        );
      }

      const team = await this.teamRepository.findById(invitation.teamId, db);

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      if (team.lockedAt) {
        throw new ConflictException('Team is locked');
      }

      const existingMember = await this.teamRepository.findMember(
        invitation.teamId,
        user.id,
        db,
      );

      if (existingMember) {
        throw new ConflictException('User is already a team member');
      }

      let membership: TeamMember;

      try {
        membership = await this.teamRepository.addMember(
          invitation.teamId,
          user.id,
          db,
        );
      } catch (error: unknown) {
        if (this.isTeamMemberUniqueConstraintError(error)) {
          throw new ConflictException('User is already a team member');
        }

        throw error;
      }

      await this.invitationRepository.markAccepted(invitation.id, db);

      return membership;
    });
  }

  revokeInvitations(
    invitationIds: string[],
    revokedAt = new Date(),
    db?: PrismaDbClient,
  ): Promise<Prisma.BatchPayload> {
    return this.invitationRepository.revokeInvitations(
      invitationIds,
      revokedAt,
      db,
    );
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
      this.invitationRepository.findActiveInvitationEmails(
        teamId,
        emails,
        now,
        db,
      ),
      this.invitationRepository.findExistingMemberEmails(teamId, emails, db),
    ]);

    const blockedEmails = new Set<string>([
      ...activeInvitations.map(({ email }) => email),
      ...existingMembers.map(({ user }) => user.email),
    ]);

    return emails.filter((email) => !blockedEmails.has(email));
  }

  private buildInvitationsToCreate(
    teamId: string,
    emails: string[],
  ): Prisma.InvitationUncheckedCreateInput[] {
    const expiresAt = this.resolveExpirationDate();
    const generatedTokens = new Set<string>();

    return emails.map((email) => {
      let token = this.hashingService.generateHexToken(
        this.configService.tokenByteLength,
      );

      while (generatedTokens.has(token)) {
        token = this.hashingService.generateHexToken(
          this.configService.tokenByteLength,
        );
      }

      generatedTokens.add(token);

      return {
        email,
        token,
        status: InvitationStatus.PENDING,
        teamId,
        expiresAt,
      };
    });
  }

  private resolveExpirationDate(): Date {
    return new Date(
      Date.now() +
        this.configService.emailVerificationExpirationHours * 60 * 60 * 1000,
    );
  }

  private isTokenUniqueConstraintError(
    error: unknown,
  ): error is { code: string; meta?: { target?: string | string[] } } {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidate = error as {
      code?: unknown;
      meta?: { target?: unknown };
    };
    const target = candidate.meta?.target;

    return (
      candidate.code === 'P2002' &&
      (Array.isArray(target) ? target.includes('token') : target === 'token')
    );
  }

  private isTeamMemberUniqueConstraintError(
    error: unknown,
  ): error is { code: string; meta?: { target?: string | string[] } } {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidate = error as {
      code?: unknown;
      meta?: { target?: unknown };
    };

    if (candidate.code !== 'P2002') {
      return false;
    }

    const target = candidate.meta?.target;

    if (Array.isArray(target)) {
      return target.includes('userId') && target.includes('teamId');
    }

    if (typeof target === 'string') {
      return (
        target.includes('userId_teamId') ||
        (target.includes('userId') && target.includes('teamId')) ||
        target.includes('TeamMember')
      );
    }

    return false;
  }
}

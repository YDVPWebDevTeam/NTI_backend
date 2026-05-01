import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Invitation, TeamMember } from '../../../generated/prisma/client';
import { Prisma } from '../../../generated/prisma/client';
import { InvitationStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { InvitationTokenService } from '../../common/invitations/invitation-token.service';
import { normalizeInviteEmail } from '../../common/validation/invite-email.validation';
import type { PrismaDbClient } from '../../infrastructure/database';
import { TeamRepository } from '../team.repository';
import {
  InvitationRepository,
  type InvitationWithTeam,
} from './invitation.repository';

const INVITATION_TOKEN_MAX_RETRIES = 5;

@Injectable()
export class InvitationService {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly teamRepository: TeamRepository,
    private readonly invitationTokenService: InvitationTokenService,
  ) {}

  async createInvites(
    teamId: string,
    emails: string[],
    db?: PrismaDbClient,
  ): Promise<Invitation[]> {
    const normalizedEmails = [...new Set(emails.map(normalizeInviteEmail))];

    for (
      let attempt = 0;
      attempt < INVITATION_TOKEN_MAX_RETRIES;
      attempt += 1
    ) {
      try {
        const createWithClient = async (tx: PrismaDbClient) => {
          const availableEmails = await this.filterInvitableEmails(
            teamId,
            normalizedEmails,
            tx,
          );

          if (availableEmails.length === 0) {
            return [];
          }

          const invitationsToCreate = this.buildInvitationsToCreate(
            teamId,
            availableEmails,
          );

          await this.invitationRepository.createMany(invitationsToCreate, tx);

          const createdInvitations =
            await this.invitationRepository.findByTokens(
              invitationsToCreate.map(({ token }) => token),
              tx,
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
        };

        if (db) {
          return await createWithClient(db);
        }

        return await this.invitationRepository.transaction(createWithClient);
      } catch (error: unknown) {
        if (
          db ||
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

    const now = new Date();
    const result = await this.invitationRepository.revokePendingById(
      invitation.id,
      now,
      db,
    );

    if (result.count === 0) {
      throw new ConflictException('Invitation is not active');
    }

    const revokedInvitation = await this.invitationRepository.findById(
      invitation.id,
      db,
    );

    if (!revokedInvitation) {
      throw new NotFoundException('Invitation not found');
    }

    return revokedInvitation;
  }

  async accept(
    token: string,
    user: Pick<AuthenticatedUserContext, 'id' | 'email'>,
    db?: PrismaDbClient,
  ): Promise<TeamMember> {
    const acceptWithClient = async (tx: PrismaDbClient) => {
      const invitation = await this.invitationRepository.findByToken(token, tx);
      const normalizedUserEmail = normalizeInviteEmail(user.email);

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.status === InvitationStatus.ACCEPTED) {
        throw new ConflictException('Invitation already accepted');
      }

      if (invitation.email !== normalizedUserEmail) {
        throw new ForbiddenException(
          'Invitation token does not belong to the authenticated user',
        );
      }

      const team = await this.teamRepository.findById(invitation.teamId, tx);

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      if (team.lockedAt) {
        throw new ConflictException('Team is locked');
      }

      const now = new Date();
      if (
        invitation.status === InvitationStatus.REVOKED ||
        invitation.revokedAt !== null ||
        invitation.expiresAt <= now
      ) {
        throw new ConflictException('Invitation expired or revoked');
      }

      const existingMember = await this.teamRepository.findMember(
        invitation.teamId,
        user.id,
        tx,
      );

      if (existingMember) {
        throw new ConflictException('User is already a team member');
      }

      const accepted = await this.invitationRepository.markAcceptedIfPending(
        invitation.id,
        normalizedUserEmail,
        now,
        tx,
      );

      if (accepted.count === 0) {
        const latestInvitation = await this.invitationRepository.findById(
          invitation.id,
          tx,
        );

        if (!latestInvitation) {
          throw new NotFoundException('Invitation not found');
        }

        if (latestInvitation.status === InvitationStatus.ACCEPTED) {
          throw new ConflictException('Invitation already accepted');
        }

        throw new ConflictException('Invitation expired or revoked');
      }

      let membership: TeamMember;

      try {
        membership = await this.teamRepository.addMember(
          invitation.teamId,
          user.id,
          tx,
        );
      } catch (error: unknown) {
        if (this.isTeamMemberUniqueConstraintError(error)) {
          throw new ConflictException('User is already a team member');
        }

        throw error;
      }

      return membership;
    };

    if (db) {
      return acceptWithClient(db);
    }

    return this.invitationRepository.transaction(acceptWithClient);
  }

  async validateTokenOrThrow(
    token: string,
    db?: PrismaDbClient,
  ): Promise<InvitationWithTeam> {
    const invitation = await this.invitationRepository.findByTokenWithTeam(
      token,
      db,
    );

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (
      invitation.status !== InvitationStatus.PENDING ||
      invitation.revokedAt !== null ||
      invitation.expiresAt <= new Date()
    ) {
      throw new BadRequestException(
        'Invitation is expired, revoked, or already accepted',
      );
    }

    return invitation;
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
    const expiresAt =
      this.invitationTokenService.resolveTeamInvitationExpirationDate();
    const generatedTokens = new Set<string>();

    return emails.map((email) => {
      let token = this.invitationTokenService.generateToken();

      while (generatedTokens.has(token)) {
        token = this.invitationTokenService.generateToken();
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

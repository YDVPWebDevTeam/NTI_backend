import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Invitation,
  Team,
  TeamMember,
} from '../../../generated/prisma/client';
import { Prisma } from '../../../generated/prisma/client';
import { InvitationStatus } from '../../../generated/prisma/enums';
import { EligibilitySignalsService } from '../../applications/eligibility-signals/eligibility-signals.service';
import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
} from '../../common/pagination';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { InvitationTokenService } from '../../common/invitations/invitation-token.service';
import { resolveDisplayInvitationStatus } from '../../common/invitations/invitation-state.utils';
import { isUniqueConstraintOnFields } from '../../common/prisma/prisma-error.utils';
import { normalizeInviteEmail } from '../../common/validation/invite-email.validation';
import type { PrismaDbClient } from '../../infrastructure/database';
import { EMAIL_JOBS, QueueService } from '../../infrastructure/queue';
import { TEAM_MESSAGES } from '../team.messages';
import { TeamRepository } from '../team.repository';
import { GetTeamInvitesQueryDto } from './dto/get-team-invites-query.dto';
import { GetTeamInvitesResponseDto } from './dto/get-team-invites-response.dto';
import { TeamInviteItemDto } from './dto/team-invite-item.dto';
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
    private readonly eligibilitySignalsService: EligibilitySignalsService,
    private readonly queueService: QueueService,
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

    throw new ConflictException(TEAM_MESSAGES.FAILED_TO_CREATE_INVITATIONS);
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
      throw new NotFoundException(TEAM_MESSAGES.INVITATION_NOT_FOUND);
    }

    const now = new Date();
    const result = await this.invitationRepository.revokePendingById(
      invitation.id,
      now,
      db,
    );

    if (result.count === 0) {
      throw new ConflictException(TEAM_MESSAGES.INVITATION_IS_NOT_ACTIVE);
    }

    const revokedInvitation = await this.invitationRepository.findById(
      invitation.id,
      db,
    );

    if (!revokedInvitation) {
      throw new NotFoundException(TEAM_MESSAGES.INVITATION_NOT_FOUND);
    }

    return revokedInvitation;
  }

  async list(
    teamId: string,
    query: GetTeamInvitesQueryDto,
    db?: PrismaDbClient,
  ): Promise<GetTeamInvitesResponseDto> {
    const now = new Date();
    const where = this.buildInvitationListWhere(teamId, query, now);
    const pagination = resolvePagination(query);

    const [invitations, total] = await Promise.all([
      this.invitationRepository.findMany(
        {
          where,
          orderBy: buildOrderBy(query.sort, query.order, [{ id: 'asc' }]),
          skip: pagination.skip,
          take: pagination.take,
        },
        db,
      ),
      this.invitationRepository.count(where, db),
    ]);

    return {
      data: invitations.map((invitation) =>
        this.toInviteItemDto(invitation, now),
      ),
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async resend(
    team: Pick<Team, 'id' | 'name' | 'lockedAt'>,
    invitationId: string,
    db?: PrismaDbClient,
  ): Promise<Invitation> {
    const invitation = await this.invitationRepository.findByIdAndTeam(
      invitationId,
      team.id,
      db,
    );

    if (!invitation) {
      throw new NotFoundException(TEAM_MESSAGES.INVITATION_NOT_FOUND);
    }

    if (team.lockedAt) {
      throw new ConflictException(TEAM_MESSAGES.TEAM_IS_LOCKED);
    }

    const now = new Date();
    if (
      invitation.status !== InvitationStatus.PENDING ||
      invitation.revokedAt !== null ||
      invitation.expiresAt <= now
    ) {
      throw new BadRequestException(
        TEAM_MESSAGES.ONLY_PENDING_NON_EXPIRED_CAN_BE_RESENT,
      );
    }

    const previousToken = invitation.token;
    const previousExpiresAt = invitation.expiresAt;
    const updated = await this.updateInvitationForResend(
      invitation.id,
      previousToken,
      db,
    );
    const jobId = `team-invitation-${updated.id}-${updated.token}`;

    try {
      await this.queueService.addEmail(
        EMAIL_JOBS.TEAM_INVITATION,
        {
          email: updated.email,
          teamName: team.name,
          token: updated.token,
        },
        { jobId },
      );
    } catch (error) {
      await this.invitationRepository.update(
        { id: invitation.id },
        {
          token: previousToken,
          expiresAt: previousExpiresAt,
        },
        db,
      );
      throw error;
    }

    return updated;
  }

  private async updateInvitationForResend(
    invitationId: string,
    previousToken: string,
    db?: PrismaDbClient,
  ): Promise<Invitation> {
    for (
      let attempt = 0;
      attempt < INVITATION_TOKEN_MAX_RETRIES;
      attempt += 1
    ) {
      const token = this.generateResendToken(previousToken);
      const expiresAt =
        this.invitationTokenService.resolveTeamInvitationExpirationDate();

      try {
        return await this.invitationRepository.update(
          { id: invitationId },
          {
            token,
            status: InvitationStatus.PENDING,
            expiresAt,
          },
          db,
        );
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

    throw new ConflictException(TEAM_MESSAGES.FAILED_TO_RESEND_INVITATION);
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
        throw new NotFoundException(TEAM_MESSAGES.INVITATION_NOT_FOUND);
      }

      if (invitation.status === InvitationStatus.ACCEPTED) {
        throw new ConflictException(TEAM_MESSAGES.INVITATION_ALREADY_ACCEPTED);
      }

      if (invitation.email !== normalizedUserEmail) {
        throw new ForbiddenException(TEAM_MESSAGES.INVITATION_TOKEN_MISMATCH);
      }

      const team = await this.teamRepository.findById(invitation.teamId, tx);

      if (!team) {
        throw new NotFoundException(TEAM_MESSAGES.TEAM_NOT_FOUND);
      }

      if (team.lockedAt) {
        throw new ConflictException(TEAM_MESSAGES.TEAM_IS_LOCKED);
      }

      const now = new Date();
      if (
        invitation.status === InvitationStatus.REVOKED ||
        invitation.revokedAt !== null ||
        invitation.expiresAt <= now
      ) {
        throw new ConflictException(
          TEAM_MESSAGES.INVITATION_EXPIRED_OR_REVOKED,
        );
      }

      const existingMember = await this.teamRepository.findMember(
        invitation.teamId,
        user.id,
        tx,
      );

      if (existingMember) {
        throw new ConflictException(TEAM_MESSAGES.USER_ALREADY_TEAM_MEMBER);
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
          throw new NotFoundException(TEAM_MESSAGES.INVITATION_NOT_FOUND);
        }

        if (latestInvitation.status === InvitationStatus.ACCEPTED) {
          throw new ConflictException(
            TEAM_MESSAGES.INVITATION_ALREADY_ACCEPTED,
          );
        }

        throw new ConflictException(
          TEAM_MESSAGES.INVITATION_EXPIRED_OR_REVOKED,
        );
      }

      let membership: TeamMember;

      try {
        membership = await this.teamRepository.addMember(
          invitation.teamId,
          user.id,
          tx,
        );
      } catch (error: unknown) {
        if (isUniqueConstraintOnFields(error, ['userId', 'teamId'])) {
          throw new ConflictException(TEAM_MESSAGES.USER_ALREADY_TEAM_MEMBER);
        }

        throw error;
      }

      await this.eligibilitySignalsService.recomputeForTeamApplications(
        invitation.teamId,
        tx,
      );

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
      throw new NotFoundException(TEAM_MESSAGES.INVITATION_NOT_FOUND);
    }

    if (
      invitation.status !== InvitationStatus.PENDING ||
      invitation.revokedAt !== null ||
      invitation.expiresAt <= new Date()
    ) {
      throw new BadRequestException(
        TEAM_MESSAGES.INVITATION_IS_EXPIRED_OR_ACCEPTED,
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
      const token = this.generateUniqueToken(generatedTokens);

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

  private generateResendToken(previousToken: string): string {
    const reservedTokens = new Set([previousToken]);

    return this.generateUniqueToken(reservedTokens);
  }

  private generateUniqueToken(reservedTokens: Set<string>): string {
    let token = this.invitationTokenService.generateToken();

    while (reservedTokens.has(token)) {
      token = this.invitationTokenService.generateToken();
    }

    return token;
  }

  private isTokenUniqueConstraintError(
    error: unknown,
  ): error is { code: string; meta?: { target?: string | string[] } } {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    return isUniqueConstraintOnFields(error, ['token']);
  }

  private buildInvitationListWhere(
    teamId: string,
    query: GetTeamInvitesQueryDto,
    now: Date,
  ): Prisma.InvitationWhereInput {
    const and: Prisma.InvitationWhereInput[] = [{ teamId }];
    const normalizedQuery = query.q?.trim();

    if (normalizedQuery) {
      and.push({
        email: {
          contains: normalizedQuery,
          mode: 'insensitive',
        },
      });
    }

    if (query.status) {
      and.push(this.buildStatusWhere(query.status, now));
    }

    const [first] = and;
    return and.length === 1 && first ? first : { AND: and };
  }

  private buildStatusWhere(
    status: InvitationStatus,
    now: Date,
  ): Prisma.InvitationWhereInput {
    switch (status) {
      case InvitationStatus.PENDING:
        return {
          status: InvitationStatus.PENDING,
          revokedAt: null,
          expiresAt: { gt: now },
        };
      case InvitationStatus.EXPIRED:
        return {
          OR: [
            { status: InvitationStatus.EXPIRED },
            {
              status: InvitationStatus.PENDING,
              revokedAt: null,
              expiresAt: { lte: now },
            },
          ],
        };
      case InvitationStatus.ACCEPTED:
        return {
          status: InvitationStatus.ACCEPTED,
        };
      case InvitationStatus.REVOKED:
        return {
          OR: [
            { status: InvitationStatus.REVOKED },
            { revokedAt: { not: null } },
          ],
        };
    }
  }

  private toInviteItemDto(
    invitation: Invitation,
    now: Date,
  ): TeamInviteItemDto {
    return {
      id: invitation.id,
      email: invitation.email,
      status: resolveDisplayInvitationStatus(invitation, now),
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      revokedAt: invitation.revokedAt,
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  OrgInvitation,
  Organization,
  Prisma,
} from '../../generated/prisma/client';
import {
  InvitationStatus,
  OrganizationStatus,
  UserRole,
} from '../../generated/prisma/enums';
import { createAndSendInviteWithRollback } from '../common/invitations/invitation-creation.utils';
import { assertPendingAndUnexpired } from '../common/invitations/invitation-state.utils';
import { addDays } from '../common/time/time.utils';
import { assertUserEmailAvailable } from '../common/users/user-guards.utils';
import { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
} from '../common/pagination';
import { normalizeInviteEmail } from '../common/validation/invite-email.validation';
import { ConfigService } from '../infrastructure/config';
import { HashingService } from '../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import type { PrismaDbClient } from '../infrastructure/database';
import { UserRepository } from '../user/user.repository';
import { CreateOrganizationInviteDto } from './dto/create-organization-invite.dto';
import { GetOrganizationInvitesQueryDto } from './dto/get-organization-invites-query.dto';
import { GetOrganizationInvitesResponseDto } from './dto/get-organization-invites-response.dto';
import { toOrganizationInviteItemDto } from './organization-invite.mapper';
import { OrganizationInviteResponseDto } from './dto/organization-invite-response.dto';
import { OrganizationMemberResponseDto } from './dto/organization-member-response.dto';
import { ResendOrganizationInviteResponseDto } from './dto/resend-organization-invite-response.dto';
import { RevokeOrganizationInviteResponseDto } from './dto/revoke-organization-invite-response.dto';
import { OrganizationInviteValidationResponseDto } from './dto/organization-invite-validation-response.dto';
import { ORGANIZATION_INVITABLE_ROLE_VALUES } from './dto/organization-role.constants';
import { OrganizationInviteRepository } from './organization-invitation.repository';
import { OrganizationRepository } from './organization.repository';
import { OrganizationAccessService } from './organization-access.service';
import { ORGANIZATION_MESSAGES } from './organization.messages';

@Injectable()
export class OrganizationInviteService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly organizationInviteRepository: OrganizationInviteRepository,
    private readonly userRepo: UserRepository,
    private readonly queueService: QueueService,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async createInvite(
    organizationId: string,
    dto: CreateOrganizationInviteDto,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationInviteResponseDto> {
    const organization =
      await this.organizationAccess.ensureOrganizationOwnerAccess(
        organizationId,
        user,
      );
    this.ensureOrganizationCanAcceptInvites(organization);

    await assertUserEmailAvailable(this.userRepo, dto.email);

    const now = new Date();
    const activeInvite =
      await this.organizationInviteRepository.findActivePendingByEmailAndOrganization(
        dto.email,
        organizationId,
        now,
      );

    if (activeInvite) {
      throw new ConflictException(
        ORGANIZATION_MESSAGES.ACTIVE_INVITE_ALREADY_EXISTS,
      );
    }

    return createAndSendInviteWithRollback(
      () =>
        this.organizationInviteRepository.create({
          email: dto.email,
          token: this.generateToken(),
          status: InvitationStatus.PENDING,
          organizationId,
          roleToAssign: dto.roleToAssign ?? UserRole.COMPANY_EMPLOYEE,
          expiresAt: this.resolveExpirationDate(),
        }),
      async (invitation) => {
        await this.queueService.addEmail(EMAIL_JOBS.ORG_INVITE, {
          email: invitation.email,
          token: invitation.token,
          organizationName: organization.name,
        });
      },
      async (invitation) => {
        await this.organizationInviteRepository.delete({ id: invitation.id });
      },
      (invitation) => {
        const { token: _token, ...response } = invitation;
        return response;
      },
    );
  }

  async listInvites(
    organizationId: string,
    query: GetOrganizationInvitesQueryDto,
    user: AuthenticatedUserContext,
  ): Promise<GetOrganizationInvitesResponseDto> {
    await this.organizationAccess.ensureOrganizationOwnerAccess(
      organizationId,
      user,
    );

    const now = new Date();
    const where = this.buildInvitationListWhere(organizationId, query, now);
    const pagination = resolvePagination(query);

    const [invitations, total] = await Promise.all([
      this.organizationInviteRepository.findMany({
        where,
        orderBy: buildOrderBy(query.sort, query.order, [{ id: 'asc' }]),
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.organizationInviteRepository.count(where),
    ]);

    return {
      data: invitations.map((invitation) =>
        toOrganizationInviteItemDto(invitation, now),
      ),
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async validateInviteToken(
    token: string,
  ): Promise<OrganizationInviteValidationResponseDto> {
    const invitation =
      await this.organizationInviteRepository.findByToken(token);

    if (!invitation) {
      throw new NotFoundException(ORGANIZATION_MESSAGES.INVITATION_NOT_FOUND);
    }

    const organization = await this.organizationRepository.findUnique({
      id: invitation.organizationId,
    });

    if (!organization) {
      throw new NotFoundException(ORGANIZATION_MESSAGES.ORGANIZATION_NOT_FOUND);
    }

    this.ensureOrganizationCanAcceptInvites(organization);
    this.assertInvitationIsAcceptable(invitation, new Date());
    this.assertInvitationRoleIsAllowed(invitation.roleToAssign);

    return {
      email: invitation.email,
      organizationName: organization.name,
      roleToAssign: invitation.roleToAssign,
    };
  }

  async revokeInvite(
    organizationId: string,
    inviteId: string,
    user: AuthenticatedUserContext,
  ): Promise<RevokeOrganizationInviteResponseDto> {
    await this.organizationAccess.ensureOrganizationOwnerAccess(
      organizationId,
      user,
    );

    const invitation = await this.findOrganizationInviteOrThrow(
      inviteId,
      organizationId,
    );

    const now = new Date();
    this.ensureInviteCanBeRevoked(invitation, now);

    const revoked = await this.organizationInviteRepository.update(
      { id: invitation.id },
      {
        status: InvitationStatus.REVOKED,
        revokedAt: now,
        revokedById: user.id,
      },
    );

    return {
      id: revoked.id,
      status: 'REVOKED',
      revokedAt: revoked.revokedAt ?? now,
    };
  }

  async resendInvite(
    organizationId: string,
    inviteId: string,
    user: AuthenticatedUserContext,
  ): Promise<ResendOrganizationInviteResponseDto> {
    const organization =
      await this.organizationAccess.ensureOrganizationOwnerAccess(
        organizationId,
        user,
      );

    const invitation = await this.findOrganizationInviteOrThrow(
      inviteId,
      organizationId,
    );

    const now = new Date();
    this.ensureInviteCanBeResent(invitation, now);

    const previousToken = invitation.token;
    const previousExpiresAt = invitation.expiresAt;
    const newToken = this.generateToken();
    const newExpiresAt = this.resolveExpirationDate(now);

    const updated = await this.organizationInviteRepository.update(
      { id: invitation.id },
      {
        token: newToken,
        status: InvitationStatus.PENDING,
        expiresAt: newExpiresAt,
      },
    );

    try {
      await this.queueService.addEmail(EMAIL_JOBS.ORG_INVITE, {
        email: updated.email,
        token: newToken,
        organizationName: organization.name,
      });
    } catch (error) {
      await this.organizationInviteRepository.update(
        { id: invitation.id },
        {
          token: previousToken,
          expiresAt: previousExpiresAt,
        },
      );
      throw error;
    }

    return {
      id: updated.id,
      email: updated.email,
      status: 'PENDING',
      expiresAt: updated.expiresAt,
    };
  }

  async acceptInvite(
    token: string,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto> {
    return this.organizationRepository.transaction(async (tx) => {
      const invitation =
        await this.organizationInviteRepository.findByTokenForUpdate(token, tx);
      const normalizedUserEmail = normalizeInviteEmail(user.email);

      if (!invitation) {
        throw new NotFoundException(ORGANIZATION_MESSAGES.INVITATION_NOT_FOUND);
      }

      if (invitation.email !== normalizedUserEmail) {
        throw new ForbiddenException(
          ORGANIZATION_MESSAGES.INVITATION_TOKEN_MISMATCH,
        );
      }

      const organization = await this.organizationRepository.findUnique(
        { id: invitation.organizationId },
        tx,
      );

      if (!organization) {
        throw new NotFoundException(
          ORGANIZATION_MESSAGES.ORGANIZATION_NOT_FOUND,
        );
      }

      const now = new Date();

      this.ensureOrganizationCanAcceptInvites(organization);
      this.assertInvitationIsAcceptable(invitation, now);
      this.assertInvitationRoleIsAllowed(invitation.roleToAssign);

      if (user.organizationId !== null) {
        throw new ConflictException(
          ORGANIZATION_MESSAGES.USER_IS_ALREADY_LINKED_TO_ORG,
        );
      }

      const accepted =
        await this.organizationInviteRepository.markAcceptedIfPending(
          invitation.id,
          now,
          tx,
        );

      if (accepted.count === 0) {
        const latestInvitation =
          await this.organizationInviteRepository.findByIdAndOrganization(
            invitation.id,
            invitation.organizationId,
            tx,
          );

        if (!latestInvitation) {
          throw new NotFoundException(
            ORGANIZATION_MESSAGES.INVITATION_NOT_FOUND,
          );
        }

        this.assertInvitationIsAcceptable(latestInvitation, now);
        throw new ConflictException(
          ORGANIZATION_MESSAGES.INVITATION_ALREADY_ACCEPTED,
        );
      }

      const linkedUser = await this.userRepo.linkToOrganizationIfUnlinked(
        user.id,
        invitation.organizationId,
        invitation.roleToAssign,
        tx,
      );

      if (linkedUser.count === 0) {
        throw new ConflictException(
          ORGANIZATION_MESSAGES.USER_IS_ALREADY_LINKED_TO_ORG,
        );
      }

      const member = await this.userRepo.findOrganizationMember(
        invitation.organizationId,
        user.id,
        tx,
      );

      if (!member) {
        throw new NotFoundException(ORGANIZATION_MESSAGES.MEMBER_NOT_FOUND);
      }

      return member;
    });
  }

  /**
   * Loads an invitation that is acceptable for a brand-new user registration
   * (used by AuthService inside its own user-creation transaction). Keeps all
   * invite/organization invariants inside the organization domain so AuthService
   * no longer reaches into organization repositories directly.
   */
  async loadAcceptableInviteForRegistration(
    token: string,
    tx: PrismaDbClient,
  ): Promise<{ invitation: OrgInvitation; organization: Organization }> {
    const invitation =
      await this.organizationInviteRepository.findByTokenForUpdate(token, tx);

    if (!invitation) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.INVITATION_NOT_FOUND);
    }

    const now = new Date();
    this.assertInvitationIsAcceptable(invitation, now);

    const organization = await this.organizationRepository.findUnique(
      { id: invitation.organizationId },
      tx,
    );

    if (!organization) {
      throw new BadRequestException(
        ORGANIZATION_MESSAGES.ORGANIZATION_NOT_FOUND,
      );
    }

    this.ensureOrganizationCanAcceptInvites(organization);

    return { invitation, organization };
  }

  async markInviteAcceptedForRegistration(
    inviteId: string,
    acceptedAt: Date,
    tx: PrismaDbClient,
  ): Promise<void> {
    await this.organizationInviteRepository.update(
      { id: inviteId },
      {
        status: InvitationStatus.ACCEPTED,
        acceptedAt,
      },
      tx,
    );
  }

  private generateToken(): string {
    return this.hashingService.generateHexToken(
      this.configService.tokenByteLength,
    );
  }

  private resolveExpirationDate(baseDate = new Date()): Date {
    return addDays(
      baseDate,
      this.configService.organizationInvitationExpirationDays,
    );
  }

  private async findOrganizationInviteOrThrow(
    inviteId: string,
    organizationId: string,
  ): Promise<OrgInvitation> {
    const invitation =
      await this.organizationInviteRepository.findByIdAndOrganization(
        inviteId,
        organizationId,
      );

    if (!invitation) {
      throw new NotFoundException(ORGANIZATION_MESSAGES.INVITATION_NOT_FOUND);
    }

    return invitation;
  }

  private ensureInviteCanBeRevoked(invitation: OrgInvitation, at: Date): void {
    assertPendingAndUnexpired(
      invitation,
      at,
      ORGANIZATION_MESSAGES.ONLY_PENDING_NON_EXPIRED_CAN_BE_REVOKED,
    );
  }

  private ensureInviteCanBeResent(invitation: OrgInvitation, at: Date): void {
    assertPendingAndUnexpired(
      invitation,
      at,
      ORGANIZATION_MESSAGES.ONLY_PENDING_NON_EXPIRED_CAN_BE_RESENT,
    );
  }

  private buildInvitationListWhere(
    organizationId: string,
    query: GetOrganizationInvitesQueryDto,
    now: Date,
  ): Prisma.OrgInvitationWhereInput {
    const and: Prisma.OrgInvitationWhereInput[] = [{ organizationId }];
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
  ): Prisma.OrgInvitationWhereInput {
    switch (status) {
      case InvitationStatus.PENDING:
        return {
          status: InvitationStatus.PENDING,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        };
      case InvitationStatus.EXPIRED:
        return {
          OR: [
            { status: InvitationStatus.EXPIRED },
            {
              status: InvitationStatus.PENDING,
              acceptedAt: null,
              revokedAt: null,
              expiresAt: { lte: now },
            },
          ],
        };
      case InvitationStatus.ACCEPTED:
        return {
          OR: [
            { status: InvitationStatus.ACCEPTED },
            { acceptedAt: { not: null } },
          ],
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

  private ensureOrganizationCanAcceptInvites(organization: Organization): void {
    if (
      organization.status === OrganizationStatus.REJECTED ||
      organization.status === OrganizationStatus.SUSPENDED
    ) {
      throw new BadRequestException(
        ORGANIZATION_MESSAGES.ORGANIZATION_NOT_ACCEPTING_INVITES,
      );
    }
  }

  private assertInvitationIsAcceptable(
    invitation: OrgInvitation,
    now: Date,
  ): void {
    if (
      invitation.status === InvitationStatus.REVOKED ||
      invitation.revokedAt !== null
    ) {
      throw new BadRequestException(
        ORGANIZATION_MESSAGES.INVITATION_HAS_BEEN_CANCELED,
      );
    }

    if (
      invitation.status === InvitationStatus.EXPIRED ||
      invitation.expiresAt <= now
    ) {
      throw new BadRequestException(
        ORGANIZATION_MESSAGES.INVITATION_HAS_EXPIRED,
      );
    }

    if (
      invitation.status === InvitationStatus.ACCEPTED ||
      invitation.acceptedAt !== null
    ) {
      throw new ConflictException(
        ORGANIZATION_MESSAGES.INVITATION_ALREADY_ACCEPTED,
      );
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        ORGANIZATION_MESSAGES.INVITATION_IS_NOT_ACTIVE,
      );
    }
  }

  private assertInvitationRoleIsAllowed(role: UserRole): void {
    if (!ORGANIZATION_INVITABLE_ROLE_VALUES.includes(role)) {
      throw new InternalServerErrorException(
        ORGANIZATION_MESSAGES.INVITATION_ROLE_NOT_PERMITTED,
      );
    }
  }
}

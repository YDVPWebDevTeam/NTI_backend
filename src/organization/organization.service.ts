import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgInvitation, Organization, Prisma } from 'generated/prisma/client';
import { createAndSendInviteWithRollback } from '../common/invitations/invitation-creation.utils';
import { assertPendingAndUnexpired } from '../common/invitations/invitation-state.utils';
import { isPrismaUniqueConstraintError } from '../common/prisma/prisma-error.utils';
import { addDays } from '../common/time/time.utils';
import { assertUserEmailAvailable } from '../common/users/user-guards.utils';
import {
  InvitationStatus,
  OrganizationStatus,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
} from '../common/pagination';
import { ConfigService } from '../infrastructure/config';
import { HashingService } from '../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { UserRepository } from '../user/user.repository';
import { CreateOrganizationInviteDto } from './dto/create-organization-invite.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { GetOrganizationInvitesQueryDto } from './dto/get-organization-invites-query.dto';
import { GetOrganizationInvitesResponseDto } from './dto/get-organization-invites-response.dto';
import { OrganizationInviteItemDto } from './dto/organization-invite-item.dto';
import { OrganizationInviteResponseDto } from './dto/organization-invite-response.dto';
import { OrganizationMemberResponseDto } from './dto/organization-member-response.dto';
import { ResendOrganizationInviteResponseDto } from './dto/resend-organization-invite-response.dto';
import { RevokeOrganizationInviteResponseDto } from './dto/revoke-organization-invite-response.dto';
import { TransferOrganizationOwnerDto } from './dto/transfer-organization-owner.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { UpdateOrganizationProfileDto } from './dto/update-organization-profile.dto';
import { OrganizationInviteRepository } from './organization-invitation.repository';
import { OrganizationRepository } from './organization.repository';
import { normalizeInviteEmail } from '../common/validation/invite-email.validation';
import { OrganizationInviteValidationResponseDto } from './dto/organization-invite-validation-response.dto';
import { ORGANIZATION_INVITABLE_ROLE_VALUES } from './dto/organization-role.constants';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepo: UserRepository,
    private readonly queueService: QueueService,
    private readonly organizationInviteRepository: OrganizationInviteRepository,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
  ) {}

  private static readonly REVOKE_INVALID_STATE_MESSAGE =
    'Only pending and non-expired invites can be revoked';
  private static readonly RESEND_INVALID_STATE_MESSAGE =
    'Only pending and non-expired invites can be resent';
  private static readonly ORGANIZATION_NOT_ACCEPTING_INVITES_MESSAGE =
    'Organization is not accepting invitations';

  private mapCreateDto(
    dto: CreateOrganizationDto,
  ): Prisma.OrganizationCreateInput {
    return {
      name: dto.name,
      ico: dto.ico,
      sector: dto.sector,
      description: dto.description,
      website: dto.website,
      logoUrl: dto.logoUrl,
    };
  }

  async getMyOrganization(
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    return this.findUserOrganizationOrThrow(user);
  }

  async updateMyOrganization(
    dto: UpdateOrganizationProfileDto,
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    const organization = await this.findUserOrganizationOrThrow(user);

    const updateData: Prisma.OrganizationUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    const nullableDirectUpdateFields = [
      'sector',
      'description',
      'website',
      'logoUrl',
    ] as const;

    for (const field of nullableDirectUpdateFields) {
      const value = dto[field];
      if (value !== undefined) {
        updateData[field] = value;
      }
    }

    if (dto.ico !== undefined) {
      if (dto.ico === null) {
        throw new BadRequestException('ICO cannot be null');
      }

      if (
        organization.status !== OrganizationStatus.PENDING &&
        dto.ico !== organization.ico
      ) {
        throw new BadRequestException(
          'ICO cannot be changed after organization is processed',
        );
      }

      updateData.ico = dto.ico;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Request body is empty');
    }

    try {
      return await this.organizationRepository.update(
        { id: organization.id },
        updateData,
      );
    } catch (e: unknown) {
      if (isPrismaUniqueConstraintError(e)) {
        throw new ConflictException('ICO already exists');
      }

      throw e;
    }
  }

  async create(dto: CreateOrganizationDto, user: AuthenticatedUserContext) {
    try {
      const organization =
        await this.organizationRepository.transaction<Organization>(
          async (tx) => {
            const org = await this.organizationRepository.create(
              this.mapCreateDto(dto),
              tx,
            );

            const result = await this.userRepo.updateOrganizationIfNotExists(
              tx,
              user.id,
              org.id,
            );

            if (result.count === 0) {
              throw new ConflictException(
                'User already linked to organization',
              );
            }

            return org;
          },
        );

      const adminEmails = ((await this.userRepo.findAdmins()) ?? []).map(
        (admin) => admin.email,
      );

      await this.queueService.addEmail(EMAIL_JOBS.ORG_PENDING_REVIEW, {
        organizationId: organization.id,
        adminEmails,
      });

      return organization;
    } catch (e: unknown) {
      if (isPrismaUniqueConstraintError(e)) {
        throw new ConflictException('ICO already exists');
      }

      throw e;
    }
  }

  async createInvite(
    organizationId: string,
    dto: CreateOrganizationInviteDto,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationInviteResponseDto> {
    const organization = await this.ensureOrganizationOwnerAccess(
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
      throw new ConflictException('Active organization invite already exists');
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
    await this.ensureOrganizationOwnerAccess(organizationId, user);

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
        this.toInviteItemDto(invitation, now),
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
      throw new NotFoundException('Invitation not found');
    }

    const organization = await this.organizationRepository.findUnique({
      id: invitation.organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
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
    await this.ensureOrganizationOwnerAccess(organizationId, user);

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
    const organization = await this.ensureOrganizationOwnerAccess(
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

  async listMembers(
    organizationId: string,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto[]> {
    await this.ensureOrganizationMemberAccess(organizationId, user);

    return this.userRepo.findOrganizationMembers(organizationId);
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
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.email !== normalizedUserEmail) {
        throw new ForbiddenException(
          'Invitation token does not belong to the authenticated user',
        );
      }

      const organization = await this.organizationRepository.findUnique(
        { id: invitation.organizationId },
        tx,
      );

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      const now = new Date();

      this.ensureOrganizationCanAcceptInvites(organization);
      this.assertInvitationIsAcceptable(invitation, now);
      this.assertInvitationRoleIsAllowed(invitation.roleToAssign);

      if (user.organizationId !== null) {
        throw new ConflictException(
          'User is already linked to an organization',
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
          throw new NotFoundException('Invitation not found');
        }

        this.assertInvitationIsAcceptable(latestInvitation, now);
        throw new ConflictException('Invitation already accepted');
      }

      const linkedUser = await this.userRepo.linkToOrganizationIfUnlinked(
        user.id,
        invitation.organizationId,
        invitation.roleToAssign,
        tx,
      );

      if (linkedUser.count === 0) {
        throw new ConflictException(
          'User is already linked to an organization',
        );
      }

      const member = await this.userRepo.findOrganizationMember(
        invitation.organizationId,
        user.id,
        tx,
      );

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      return member;
    });
  }

  async updateMemberRole(
    organizationId: string,
    memberUserId: string,
    dto: UpdateOrganizationMemberRoleDto,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto> {
    await this.ensureOrganizationOwnerAccess(organizationId, user);

    const member = await this.userRepo.findOrganizationMember(
      organizationId,
      memberUserId,
    );

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const requestedRole = dto.role as UserRole;

    if (requestedRole === UserRole.COMPANY_OWNER) {
      throw new BadRequestException(
        'Use ownership transfer endpoint to set company owner',
      );
    }

    if (member.role === UserRole.COMPANY_OWNER) {
      throw new BadRequestException(
        'Current owner role cannot be changed directly',
      );
    }

    return this.userRepo.updateUserRole(memberUserId, requestedRole);
  }

  async removeMember(
    organizationId: string,
    memberUserId: string,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto> {
    await this.ensureOrganizationOwnerAccess(organizationId, user);

    const member = await this.userRepo.findOrganizationMember(
      organizationId,
      memberUserId,
    );

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === UserRole.COMPANY_OWNER) {
      throw new BadRequestException('Current owner cannot be removed');
    }

    return this.userRepo.removeOrganizationMember(memberUserId);
  }

  async transferOwner(
    organizationId: string,
    dto: TransferOrganizationOwnerDto,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto> {
    await this.ensureOrganizationOwnerAccess(organizationId, user);

    if (dto.newOwnerUserId === user.id) {
      throw new BadRequestException('User is already organization owner');
    }

    return this.organizationRepository.transaction<OrganizationMemberResponseDto>(
      async (tx) => {
        const currentOwner = await this.userRepo.findOrganizationMember(
          organizationId,
          user.id,
          tx,
        );

        if (!currentOwner) {
          throw new NotFoundException('Current owner not found');
        }

        if (currentOwner.role !== UserRole.COMPANY_OWNER) {
          throw new ForbiddenException();
        }

        const newOwner = await this.userRepo.findOrganizationMember(
          organizationId,
          dto.newOwnerUserId,
          tx,
        );

        if (!newOwner) {
          throw new NotFoundException('Member not found');
        }

        if (newOwner.status !== UserStatus.ACTIVE) {
          throw new BadRequestException('New owner must be active');
        }

        await this.userRepo.updateUserRole(
          currentOwner.id,
          UserRole.COMPANY_EMPLOYEE,
          tx,
        );

        return this.userRepo.updateUserRole(
          newOwner.id,
          UserRole.COMPANY_OWNER,
          tx,
        );
      },
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

  private async findUserOrganizationOrThrow(
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    if (!user.organizationId) {
      throw new NotFoundException('Organization not found');
    }

    const organization = await this.organizationRepository.findUnique({
      id: user.organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  private async ensureOrganizationOwnerAccess(
    organizationId: string,
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (user.organizationId !== organizationId) {
      throw new ForbiddenException();
    }

    if (user.role !== UserRole.COMPANY_OWNER) {
      throw new ForbiddenException();
    }

    return organization;
  }

  private async ensureOrganizationMemberAccess(
    organizationId: string,
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (user.organizationId !== organizationId) {
      throw new ForbiddenException();
    }

    return organization;
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
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  private ensureInviteCanBeRevoked(invitation: OrgInvitation, at: Date): void {
    assertPendingAndUnexpired(
      invitation,
      at,
      OrganizationService.REVOKE_INVALID_STATE_MESSAGE,
    );
  }

  private ensureInviteCanBeResent(invitation: OrgInvitation, at: Date): void {
    assertPendingAndUnexpired(
      invitation,
      at,
      OrganizationService.RESEND_INVALID_STATE_MESSAGE,
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

    return and.length === 1 ? and[0] : { AND: and };
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

  private toInviteItemDto(
    invitation: OrgInvitation,
    now: Date,
  ): OrganizationInviteItemDto {
    return {
      id: invitation.id,
      email: invitation.email,
      status: this.resolveInvitationStatus(invitation, now),
      roleToAssign: invitation.roleToAssign,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
    };
  }

  private ensureOrganizationCanAcceptInvites(organization: Organization): void {
    if (
      organization.status === OrganizationStatus.REJECTED ||
      organization.status === OrganizationStatus.SUSPENDED
    ) {
      throw new BadRequestException(
        OrganizationService.ORGANIZATION_NOT_ACCEPTING_INVITES_MESSAGE,
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
      throw new BadRequestException('Invitation has been canceled');
    }

    if (
      invitation.status === InvitationStatus.EXPIRED ||
      invitation.expiresAt <= now
    ) {
      throw new BadRequestException('Invitation has expired');
    }

    if (
      invitation.status === InvitationStatus.ACCEPTED ||
      invitation.acceptedAt !== null
    ) {
      throw new ConflictException('Invitation already accepted');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is not active');
    }
  }

  private assertInvitationRoleIsAllowed(role: UserRole): void {
    if (!ORGANIZATION_INVITABLE_ROLE_VALUES.includes(role)) {
      throw new InternalServerErrorException(
        'Invitation role is not permitted for organization invites',
      );
    }
  }

  private resolveInvitationStatus(
    invitation: OrgInvitation,
    now: Date,
  ): InvitationStatus {
    if (
      invitation.status === InvitationStatus.REVOKED ||
      invitation.revokedAt !== null
    ) {
      return InvitationStatus.REVOKED;
    }

    if (
      invitation.status === InvitationStatus.ACCEPTED ||
      invitation.acceptedAt !== null
    ) {
      return InvitationStatus.ACCEPTED;
    }

    if (
      invitation.status === InvitationStatus.EXPIRED ||
      invitation.expiresAt <= now
    ) {
      return InvitationStatus.EXPIRED;
    }

    return InvitationStatus.PENDING;
  }
}

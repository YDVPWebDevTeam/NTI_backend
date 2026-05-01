import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgInvitation, Organization, Prisma } from 'generated/prisma/client';
import {
  InvitationStatus,
  OrganizationStatus,
  UserRole,
} from 'generated/prisma/enums';
import { AuthenticatedUserContext } from 'src/common/types/auth-user-context.type';
import { ConfigService } from 'src/infrastructure/config';
import { HashingService } from 'src/infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from 'src/infrastructure/queue';
import { UserRepository } from 'src/user/user.repository';
import { CreateOrganizationInviteDto } from './dto/create-organization-invite.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { GetOrganizationInvitesQueryDto } from './dto/get-organization-invites-query.dto';
import { GetOrganizationInvitesResponseDto } from './dto/get-organization-invites-response.dto';
import { OrganizationInviteItemDto } from './dto/organization-invite-item.dto';
import { ResendOrganizationInviteResponseDto } from './dto/resend-organization-invite-response.dto';
import { RevokeOrganizationInviteResponseDto } from './dto/revoke-organization-invite-response.dto';
import { UpdateOrganizationProfileDto } from './dto/update-organization-profile.dto';
import { OrganizationInviteRepository } from './organization-invitation.repository';
import { OrganizationRepository } from './organization.repository';

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

  async updateMyOrganization(
    dto: UpdateOrganizationProfileDto,
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

    const updateData: Prisma.OrganizationUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.ico !== undefined) {
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
    if (dto.sector !== undefined) {
      updateData.sector = dto.sector;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.website !== undefined) {
      updateData.website = dto.website;
    }
    if (dto.logoUrl !== undefined) {
      updateData.logoUrl = dto.logoUrl;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Request body is empty');
    }

    try {
      return await this.organizationRepository.update(
        { id: user.organizationId },
        updateData,
      );
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
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
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('ICO already exists');
      }

      throw e;
    }
  }

  async createInvite(
    organizationId: string,
    dto: CreateOrganizationInviteDto,
    user: AuthenticatedUserContext,
  ) {
    const organization = await this.ensureOrganizationOwnerAccess(
      organizationId,
      user,
    );

    const existingUser = await this.userRepo.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

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

    const invitation = await this.organizationInviteRepository.create({
      email: dto.email,
      token: this.generateToken(),
      status: InvitationStatus.PENDING,
      organizationId,
      roleToAssign: UserRole.COMPANY_EMPLOYEE,
      expiresAt: this.resolveExpirationDate(),
    });

    const { token, ...response } = invitation;

    try {
      await this.queueService.addEmail(EMAIL_JOBS.ORG_INVITE, {
        email: invitation.email,
        token,
        organizationName: organization.name,
      });
    } catch (error) {
      await this.organizationInviteRepository.delete({ id: invitation.id });
      throw error;
    }

    return response;
  }

  async listInvites(
    organizationId: string,
    query: GetOrganizationInvitesQueryDto,
    user: AuthenticatedUserContext,
  ): Promise<GetOrganizationInvitesResponseDto> {
    await this.ensureOrganizationOwnerAccess(organizationId, user);

    const now = new Date();
    const where = this.buildInvitationListWhere(organizationId, query, now);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [invitations, total] = await Promise.all([
      this.organizationInviteRepository.findMany({
        where,
        orderBy: [{ createdAt: this.resolveSortOrder(query.sort) }],
        skip,
        take: limit,
      }),
      this.organizationInviteRepository.count(where),
    ]);

    return {
      data: invitations.map((invitation) =>
        this.toInviteItemDto(invitation, now),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
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

  private generateToken(): string {
    return this.hashingService.generateHexToken(
      this.configService.tokenByteLength,
    );
  }

  private resolveExpirationDate(baseDate = new Date()): Date {
    return new Date(
      baseDate.getTime() +
        this.configService.organizationInvitationExpirationDays *
          24 *
          60 *
          60 *
          1000,
    );
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
    if (!this.isPendingAndUnexpired(invitation, at)) {
      throw new BadRequestException(
        OrganizationService.REVOKE_INVALID_STATE_MESSAGE,
      );
    }
  }

  private ensureInviteCanBeResent(invitation: OrgInvitation, at: Date): void {
    if (!this.isPendingAndUnexpired(invitation, at)) {
      throw new BadRequestException(
        OrganizationService.RESEND_INVALID_STATE_MESSAGE,
      );
    }
  }

  private isPendingAndUnexpired(invitation: OrgInvitation, at: Date): boolean {
    return (
      invitation.status === InvitationStatus.PENDING &&
      invitation.acceptedAt === null &&
      invitation.revokedAt === null &&
      invitation.expiresAt > at
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

  private resolveSortOrder(
    sort: GetOrganizationInvitesQueryDto['sort'],
  ): Prisma.SortOrder {
    return sort === 'createdAt:asc' ? 'asc' : 'desc';
  }

  private toInviteItemDto(
    invitation: OrgInvitation,
    now: Date,
  ): OrganizationInviteItemDto {
    return {
      id: invitation.id,
      email: invitation.email,
      status: this.resolveInvitationStatus(invitation, now),
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
    };
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

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Organization, Prisma } from 'generated/prisma/client';
import { isPrismaUniqueConstraintError } from '../common/prisma/prisma-error.utils';
import {
  OrganizationStatus,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { UserRepository } from '../user/user.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationMemberResponseDto } from './dto/organization-member-response.dto';
import { TransferOrganizationOwnerDto } from './dto/transfer-organization-owner.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { UpdateOrganizationProfileDto } from './dto/update-organization-profile.dto';
import { OrganizationRepository } from './organization.repository';
import { OrganizationAccessService } from './organization-access.service';
import { ORGANIZATION_MESSAGES } from './organization.messages';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepo: UserRepository,
    private readonly queueService: QueueService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

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
    return this.organizationAccess.findUserOrganizationOrThrow(user);
  }

  async updateMyOrganization(
    dto: UpdateOrganizationProfileDto,
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    const organization =
      await this.organizationAccess.findUserOrganizationOrThrow(user);

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
        throw new BadRequestException(ORGANIZATION_MESSAGES.ICO_CANNOT_BE_NULL);
      }

      if (
        organization.status !== OrganizationStatus.PENDING &&
        dto.ico !== organization.ico
      ) {
        throw new BadRequestException(
          ORGANIZATION_MESSAGES.ICO_CANNOT_BE_CHANGED,
        );
      }

      updateData.ico = dto.ico;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.REQUEST_BODY_EMPTY);
    }

    try {
      return await this.organizationRepository.update(
        { id: organization.id },
        updateData,
      );
    } catch (e: unknown) {
      if (isPrismaUniqueConstraintError(e)) {
        throw new ConflictException(ORGANIZATION_MESSAGES.ICO_ALREADY_EXISTS);
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
                ORGANIZATION_MESSAGES.USER_ALREADY_LINKED_TO_ORG,
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
        throw new ConflictException(ORGANIZATION_MESSAGES.ICO_ALREADY_EXISTS);
      }

      throw e;
    }
  }

  async listMembers(
    organizationId: string,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto[]> {
    await this.organizationAccess.ensureOrganizationMemberAccess(
      organizationId,
      user,
    );

    return this.userRepo.findOrganizationMembers(organizationId);
  }

  async updateMemberRole(
    organizationId: string,
    memberUserId: string,
    dto: UpdateOrganizationMemberRoleDto,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto> {
    await this.organizationAccess.ensureOrganizationOwnerAccess(
      organizationId,
      user,
    );

    const member = await this.userRepo.findOrganizationMember(
      organizationId,
      memberUserId,
    );

    if (!member) {
      throw new NotFoundException(ORGANIZATION_MESSAGES.MEMBER_NOT_FOUND);
    }

    const requestedRole = dto.role as UserRole;

    if (requestedRole === UserRole.COMPANY_OWNER) {
      throw new BadRequestException(
        ORGANIZATION_MESSAGES.USE_OWNERSHIP_TRANSFER_ENDPOINT,
      );
    }

    if (member.role === UserRole.COMPANY_OWNER) {
      throw new BadRequestException(
        ORGANIZATION_MESSAGES.CURRENT_OWNER_ROLE_CANNOT_BE_CHANGED,
      );
    }

    return this.userRepo.updateUserRole(memberUserId, requestedRole);
  }

  async removeMember(
    organizationId: string,
    memberUserId: string,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto> {
    await this.organizationAccess.ensureOrganizationOwnerAccess(
      organizationId,
      user,
    );

    const member = await this.userRepo.findOrganizationMember(
      organizationId,
      memberUserId,
    );

    if (!member) {
      throw new NotFoundException(ORGANIZATION_MESSAGES.MEMBER_NOT_FOUND);
    }

    if (member.role === UserRole.COMPANY_OWNER) {
      throw new BadRequestException(
        ORGANIZATION_MESSAGES.CURRENT_OWNER_CANNOT_BE_REMOVED,
      );
    }

    return this.userRepo.removeOrganizationMember(memberUserId);
  }

  async transferOwner(
    organizationId: string,
    dto: TransferOrganizationOwnerDto,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto> {
    await this.organizationAccess.ensureOrganizationOwnerAccess(
      organizationId,
      user,
    );

    if (dto.newOwnerUserId === user.id) {
      throw new BadRequestException(
        ORGANIZATION_MESSAGES.USER_IS_ALREADY_OWNER,
      );
    }

    return this.organizationRepository.transaction<OrganizationMemberResponseDto>(
      async (tx) => {
        const currentOwner = await this.userRepo.findOrganizationMember(
          organizationId,
          user.id,
          tx,
        );

        if (!currentOwner) {
          throw new NotFoundException(
            ORGANIZATION_MESSAGES.CURRENT_OWNER_NOT_FOUND,
          );
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
          throw new NotFoundException(ORGANIZATION_MESSAGES.MEMBER_NOT_FOUND);
        }

        if (newOwner.status !== UserStatus.ACTIVE) {
          throw new BadRequestException(
            ORGANIZATION_MESSAGES.NEW_OWNER_MUST_BE_ACTIVE,
          );
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
}

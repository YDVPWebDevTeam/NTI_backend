import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { OrganizationStatus } from '../../../generated/prisma/enums';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
} from '../../common/pagination';
import { EMAIL_JOBS, QueueService } from '../../infrastructure/queue';
import { OrganizationRepository } from '../../organization/organization.repository';
import { UserRepository } from '../../user/user.repository';
import { AdminOrganizationResponseDto } from './dto/admin-organization-response.dto';
import { OrganizationStatusResponseDto } from './dto/organization-status-response.dto';
import {
  MANAGEABLE_ORG_STATUSES,
  UpdateOrgStatusDto,
} from './dto/update-org-status.dto';
import type { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto';
import type { ListOrganizationsResponseDto } from './dto/list-organizations-response.dto';
import { ADMIN_ORGANIZATIONS_MESSAGES } from './admin-organizations.messages';

@Injectable()
export class AdminOrganizationsService {
  private readonly logger = new Logger(AdminOrganizationsService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly queueService: QueueService,
  ) {}

  async listOrganizations(
    actor: AuthenticatedUserContext,
    query: ListOrganizationsQueryDto,
  ): Promise<ListOrganizationsResponseDto> {
    ensureAdminRole(actor.role, 'Only administrators can access organizations');

    const where: Prisma.OrganizationWhereInput = {
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { ico: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
      ...(query.status && { status: query.status }),
      ...(query.sector && {
        sector: { contains: query.sector, mode: 'insensitive' },
      }),
    };

    const orderBy = buildOrderBy(query.sort, query.order, [{ id: 'asc' }]);
    const pagination = resolvePagination(query);

    const { data, total } =
      await this.organizationRepository.findManyForAdminPaginated({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      });

    return {
      data: data.map((org) => ({
        id: org.id,
        name: org.name,
        ico: org.ico,
        status: org.status,
        sector: org.sector,
        membersCount: org.membersCount,
        createdAt: org.createdAt,
      })),
      meta: {
        ...buildPaginationMeta(total, pagination.page, pagination.limit),
        sort: query.sort,
        order: query.order,
      },
    };
  }

  async getOrganization(
    actor: AuthenticatedUserContext,
    organizationId: string,
  ): Promise<AdminOrganizationResponseDto> {
    ensureAdminRole(actor.role, 'Only administrators can access organizations');

    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException(
        ADMIN_ORGANIZATIONS_MESSAGES.ORGANIZATION_NOT_FOUND,
      );
    }

    const owner =
      await this.userRepository.findOrganizationOwner(organizationId);

    if (!owner) {
      throw new NotFoundException(
        ADMIN_ORGANIZATIONS_MESSAGES.ORGANIZATION_OWNER_NOT_FOUND,
      );
    }

    return {
      ...organization,
      owner: {
        id: owner.id,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
      },
    };
  }

  async updateStatus(
    actor: AuthenticatedUserContext,
    organizationId: string,
    dto: UpdateOrgStatusDto,
  ): Promise<OrganizationStatusResponseDto> {
    ensureAdminRole(
      actor.role,
      'Only administrators can process organization statuses',
    );

    const updateResult = await this.organizationRepository.updateMany(
      {
        id: organizationId,
        status: OrganizationStatus.PENDING,
      },
      { status: dto.status },
    );

    if (updateResult.count === 0) {
      const existingOrganization = await this.organizationRepository.findUnique(
        {
          id: organizationId,
        },
      );

      if (!existingOrganization) {
        throw new NotFoundException(
          ADMIN_ORGANIZATIONS_MESSAGES.ORGANIZATION_NOT_FOUND,
        );
      }

      throw new BadRequestException(
        ADMIN_ORGANIZATIONS_MESSAGES.ORGANIZATION_ALREADY_PROCESSED,
      );
    }

    const updatedOrganization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!updatedOrganization) {
      throw new NotFoundException(
        ADMIN_ORGANIZATIONS_MESSAGES.ORGANIZATION_NOT_FOUND,
      );
    }

    const owner =
      await this.userRepository.findOrganizationOwner(organizationId);

    if (!owner) {
      this.logger.warn(
        `No company owners found for organization ${organizationId}; notification skipped`,
      );
      return updatedOrganization;
    }

    if (dto.status === MANAGEABLE_ORG_STATUSES.ACTIVE) {
      await this.queueService.addEmail(EMAIL_JOBS.ORG_APPROVED, {
        organizationId,
        organizationName: updatedOrganization.name,
        ownerEmails: [owner.email],
      });

      return updatedOrganization;
    }

    await this.queueService.addEmail(EMAIL_JOBS.ORG_REJECTED, {
      organizationId,
      organizationName: updatedOrganization.name,
      ownerEmails: [owner.email],
      rejectionReason: dto.rejectionReason ?? 'No reason provided',
    });

    return updatedOrganization;
  }
}

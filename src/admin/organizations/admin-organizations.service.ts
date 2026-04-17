import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationStatus, UserRole } from '../../../generated/prisma/enums';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { EMAIL_JOBS, QueueService } from '../../infrastructure/queue';
import { OrganizationRepository } from '../../organization/organization.repository';
import { UserRepository } from '../../user/user.repository';
import { OrganizationStatusResponseDto } from './dto/organization-status-response.dto';
import {
  MANAGEABLE_ORG_STATUSES,
  UpdateOrgStatusDto,
} from './dto/update-org-status.dto';

@Injectable()
export class AdminOrganizationsService {
  private readonly logger = new Logger(AdminOrganizationsService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly queueService: QueueService,
  ) {}

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
        throw new NotFoundException('Organization not found');
      }

      throw new BadRequestException('Organization has already been processed');
    }

    const updatedOrganization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!updatedOrganization) {
      throw new NotFoundException('Organization not found');
    }

    const owners = await this.userRepository.findMany({
      where: {
        organizationId,
        role: UserRole.COMPANY_OWNER,
      },
    });

    const ownerEmails = owners.map((owner) => owner.email);

    if (ownerEmails.length === 0) {
      this.logger.warn(
        `No company owners found for organization ${organizationId}; notification skipped`,
      );
      return updatedOrganization;
    }

    if (dto.status === MANAGEABLE_ORG_STATUSES.ACTIVE) {
      await this.queueService.addEmail(EMAIL_JOBS.ORG_APPROVED, {
        organizationId,
        organizationName: updatedOrganization.name,
        ownerEmails,
      });

      return updatedOrganization;
    }

    await this.queueService.addEmail(EMAIL_JOBS.ORG_REJECTED, {
      organizationId,
      organizationName: updatedOrganization.name,
      ownerEmails,
      rejectionReason: dto.rejectionReason ?? 'No reason provided',
    });

    return updatedOrganization;
  }
}

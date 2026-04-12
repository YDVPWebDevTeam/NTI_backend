import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationStatus, UserRole } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EMAIL_JOBS } from '../../infrastructure/queue/queue.types';
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
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can process organization statuses',
      );
    }

    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.status !== OrganizationStatus.PENDING) {
      throw new BadRequestException('Organization has already been processed');
    }

    const updatedOrganization = await this.organizationRepository.update(
      { id: organizationId },
      { status: dto.status },
    );

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

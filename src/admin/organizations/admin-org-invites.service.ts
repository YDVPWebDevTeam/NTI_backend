import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationStatus } from '../../../generated/prisma/enums';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { OrganizationRepository } from '../../organization/organization.repository';
import { OrganizationStatusResponseDto } from './dto/organization-status-response.dto';

@Injectable()
export class AdminOrgInvitesService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async listAll(
    actor: AuthenticatedUserContext,
  ): Promise<OrganizationStatusResponseDto[]> {
    ensureAdminRole(
      actor.role,
      'Only administrators can access organization applications',
    );

    return this.organizationRepository.findMany({
      where: { status: OrganizationStatus.PENDING },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async listByOrganization(
    actor: AuthenticatedUserContext,
    organizationId: string,
  ): Promise<OrganizationStatusResponseDto[]> {
    ensureAdminRole(
      actor.role,
      'Only administrators can access organization applications',
    );

    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return [organization];
  }
}

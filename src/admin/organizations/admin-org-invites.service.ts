import { Injectable, NotFoundException } from '@nestjs/common';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { OrganizationRepository } from '../../organization/organization.repository';
import { OrgInvitationRepository } from './org-invitation.repository';
import { OrgInviteResponseDto } from './dto/org-invite-response.dto';

@Injectable()
export class AdminOrgInvitesService {
  constructor(
    private readonly orgInvitationRepository: OrgInvitationRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async listAll(
    actor: AuthenticatedUserContext,
  ): Promise<OrgInviteResponseDto[]> {
    ensureAdminRole(
      actor.role,
      'Only administrators can access organization invitations',
    );

    return this.orgInvitationRepository.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async listByOrganization(
    actor: AuthenticatedUserContext,
    organizationId: string,
  ): Promise<OrgInviteResponseDto[]> {
    ensureAdminRole(
      actor.role,
      'Only administrators can access organization invitations',
    );

    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.orgInvitationRepository.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }
}

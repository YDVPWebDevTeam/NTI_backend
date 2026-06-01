import { Injectable, NotFoundException } from '@nestjs/common';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { OrganizationInviteItemDto } from '../../organization/dto/organization-invite-item.dto';
import { OrganizationInviteRepository } from '../../organization/organization-invitation.repository';
import { OrganizationRepository } from '../../organization/organization.repository';
import { toOrganizationInviteItemDto } from '../../organization/organization-invite.mapper';
import { ADMIN_ORG_INVITES_MESSAGES } from './admin-org-invites.messages';

@Injectable()
export class AdminOrgInvitesService {
  constructor(
    private readonly organizationInviteRepository: OrganizationInviteRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async listAll(
    actor: AuthenticatedUserContext,
  ): Promise<OrganizationInviteItemDto[]> {
    ensureAdminRole(actor.role, ADMIN_ORG_INVITES_MESSAGES.ADMIN_ONLY_ACCESS);

    const now = new Date();
    const invites = await this.organizationInviteRepository.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });

    return invites.map((invite) => toOrganizationInviteItemDto(invite, now));
  }

  async listByOrganization(
    actor: AuthenticatedUserContext,
    organizationId: string,
  ): Promise<OrganizationInviteItemDto[]> {
    ensureAdminRole(actor.role, ADMIN_ORG_INVITES_MESSAGES.ADMIN_ONLY_ACCESS);

    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException(
        ADMIN_ORG_INVITES_MESSAGES.ORGANIZATION_NOT_FOUND,
      );
    }

    const now = new Date();
    const invites = await this.organizationInviteRepository.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return invites.map((invite) => toOrganizationInviteItemDto(invite, now));
  }
}

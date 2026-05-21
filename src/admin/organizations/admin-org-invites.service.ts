import { Injectable, NotFoundException } from '@nestjs/common';
import { InvitationStatus } from '../../../generated/prisma/enums';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { OrganizationInviteItemDto } from '../../organization/dto/organization-invite-item.dto';
import { OrganizationInviteRepository } from '../../organization/organization-invitation.repository';
import { OrganizationRepository } from '../../organization/organization.repository';
import type { OrgInvitation } from '../../../generated/prisma/client';

@Injectable()
export class AdminOrgInvitesService {
  constructor(
    private readonly organizationInviteRepository: OrganizationInviteRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async listAll(
    actor: AuthenticatedUserContext,
  ): Promise<OrganizationInviteItemDto[]> {
    ensureAdminRole(
      actor.role,
      'Only administrators can access organization invites',
    );

    const now = new Date();
    const invites = await this.organizationInviteRepository.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });

    return invites.map((invite) => this.toInviteItemDto(invite, now));
  }

  async listByOrganization(
    actor: AuthenticatedUserContext,
    organizationId: string,
  ): Promise<OrganizationInviteItemDto[]> {
    ensureAdminRole(
      actor.role,
      'Only administrators can access organization invites',
    );

    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const now = new Date();
    const invites = await this.organizationInviteRepository.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return invites.map((invite) => this.toInviteItemDto(invite, now));
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

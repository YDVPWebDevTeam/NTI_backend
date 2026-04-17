import { Injectable, NotFoundException } from '@nestjs/common';
import type { OrgInvitation } from '../../../generated/prisma/client';
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

    const invitations = await this.orgInvitationRepository.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });

    return invitations.map((invitation) => this.toResponseDto(invitation));
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

    const invitations = await this.orgInvitationRepository.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return invitations.map((invitation) => this.toResponseDto(invitation));
  }

  private toResponseDto(invitation: OrgInvitation): OrgInviteResponseDto {
    return {
      id: invitation.id,
      email: invitation.email,
      roleToAssign: invitation.roleToAssign,
      status: invitation.status,
      organizationId: invitation.organizationId,
      revokedById: invitation.revokedById,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
    };
  }
}

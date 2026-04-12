import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
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
    this.ensureAdminRole(actor.role);

    return this.orgInvitationRepository.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async listByOrganization(
    actor: AuthenticatedUserContext,
    organizationId: string,
  ): Promise<OrgInviteResponseDto[]> {
    this.ensureAdminRole(actor.role);

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

  private ensureAdminRole(role: UserRole): void {
    if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can access organization invitations',
      );
    }
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Organization } from '../../generated/prisma/client';
import { UserRole } from '../../generated/prisma/enums';
import { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { OrganizationRepository } from './organization.repository';
import { ORGANIZATION_MESSAGES } from './organization.messages';

@Injectable()
export class OrganizationAccessService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async findUserOrganizationOrThrow(
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    if (!user.organizationId) {
      throw new NotFoundException(ORGANIZATION_MESSAGES.ORGANIZATION_NOT_FOUND);
    }

    const organization = await this.organizationRepository.findUnique({
      id: user.organizationId,
    });

    if (!organization) {
      throw new NotFoundException(ORGANIZATION_MESSAGES.ORGANIZATION_NOT_FOUND);
    }

    return organization;
  }

  async ensureOrganizationOwnerAccess(
    organizationId: string,
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException(ORGANIZATION_MESSAGES.ORGANIZATION_NOT_FOUND);
    }

    if (user.organizationId !== organizationId) {
      throw new ForbiddenException();
    }

    if (user.role !== UserRole.COMPANY_OWNER) {
      throw new ForbiddenException();
    }

    return organization;
  }

  async ensureOrganizationMemberAccess(
    organizationId: string,
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException(ORGANIZATION_MESSAGES.ORGANIZATION_NOT_FOUND);
    }

    if (user.organizationId !== organizationId) {
      throw new ForbiddenException();
    }

    return organization;
  }
}

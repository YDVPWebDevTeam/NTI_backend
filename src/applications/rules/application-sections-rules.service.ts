import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { ApplicationWithRelations } from '../applications.repository';
import { ApplicationStatus, UserRole } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';

@Injectable()
export class ApplicationSectionsRulesService {
  assertApplicationIsDraft(status: ApplicationStatus): void {
    if (status !== ApplicationStatus.DRAFT) {
      throw new BadRequestException(
        `Only draft applications can be modified (status: ${status})`,
      );
    }
  }

  assertReadAccess(
    application: ApplicationWithRelations,
    user: AuthenticatedUserContext,
  ): void {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    const isTeamMember =
      application.team.leaderId === user.id ||
      application.team.members?.some((member) => member.userId === user.id);

    if (!isTeamMember) {
      throw new ForbiddenException(
        'You do not have permission to view this application',
      );
    }
  }

  assertWriteAccess(
    application: ApplicationWithRelations,
    user: AuthenticatedUserContext,
  ): void {
    if (application.team.leaderId !== user.id) {
      throw new ForbiddenException(
        'Only team lead can update application sections',
      );
    }
  }

  assertAdminAccess(user: AuthenticatedUserContext): void {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }
}

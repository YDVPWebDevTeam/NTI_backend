import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { ApplicationWithRelations } from '../applications.repository';
import { ApplicationStatus, UserRole } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import {
  isAdminRole,
  isReviewerRole,
  isTeamMember,
} from '../../common/auth/role-groups';
import { APPLICATIONS_MESSAGES } from '../applications.messages';

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
    if (isReviewerRole(user.role)) {
      return;
    }

    if (user.role === UserRole.MENTOR && application.mentorUserId === user.id) {
      return;
    }

    if (!isTeamMember(application.team, user.id)) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.NO_PERMISSION_VIEW_APPLICATION,
      );
    }
  }

  assertWriteAccess(
    application: ApplicationWithRelations,
    user: AuthenticatedUserContext,
  ): void {
    if (application.team.leaderId !== user.id) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.ONLY_TEAM_LEAD_CAN_UPDATE_SECTIONS,
      );
    }
  }

  assertAdminAccess(user: AuthenticatedUserContext): void {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException(APPLICATIONS_MESSAGES.ADMIN_ACCESS_REQUIRED);
    }
  }
}

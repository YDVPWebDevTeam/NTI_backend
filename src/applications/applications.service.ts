import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import {
  ApplicationWithRelations,
  ApplicationsRepository,
} from './applications.repository';
import { ApplicationRulesService } from './application-rules.service';

const ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.DRAFT,
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.FORMALLY_VERIFIED,
  ApplicationStatus.EVALUATING,
  ApplicationStatus.NEEDS_INFO,
  ApplicationStatus.APPROVED,
  ApplicationStatus.ONBOARDING,
  ApplicationStatus.ACTIVE_PROJECT,
  ApplicationStatus.PAUSED,
  ApplicationStatus.COMPLETED,
];

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly applicationRulesService: ApplicationRulesService,
  ) {}

  async createDraft(
    user: AuthenticatedUserContext,
    dto: CreateApplicationDto,
  ): Promise<ApplicationDetailDto> {
    // Validate all business rules (call status, team state, requester rights)
    await this.applicationRulesService.validateApplicationCreationRules(
      dto.callId,
      dto.teamId,
      user.id,
    );

    let created: ApplicationWithRelations;

    try {
      // Use transaction to prevent race conditions on duplicate check
      created = await this.applicationsRepository.transaction(async (db) => {
        // Double-check inside transaction for active duplicate
        const existing =
          await this.applicationsRepository.findActiveByTeamAndCall(
            dto.teamId,
            dto.callId,
            ACTIVE_APPLICATION_STATUSES,
            db,
          );

        if (existing) {
          throw new ConflictException(
            'An active application for this team and call already exists',
          );
        }

        return this.applicationsRepository.createDraft(
          dto.callId,
          dto.teamId,
          user.id,
          db,
        );
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'An active application for this team and call already exists',
        );
      }
      throw error;
    }

    return this.toDetailDto(created);
  }

  async findById(
    id: string,
    requestingUser: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    const application =
      await this.applicationsRepository.findByIdWithRelations(id);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    this.validateApplicationAccess(application, requestingUser);

    return this.toDetailDto(application);
  }

  private validateApplicationAccess(
    application: ApplicationWithRelations,
    user: AuthenticatedUserContext,
  ): void {
    // Admins can always view applications
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    // Team members (including lead) can view their team's applications
    const isTeamMember =
      application.team.leaderId === user.id ||
      application.team.members?.some((member) => member.userId === user.id);

    if (!isTeamMember) {
      throw new ForbiddenException(
        'You do not have permission to view this application',
      );
    }
  }

  private toDetailDto(
    application: ApplicationWithRelations,
  ): ApplicationDetailDto {
    return {
      id: application.id,
      callId: application.callId,
      teamId: application.teamId,
      createdById: application.createdById,
      status: application.status,
      submittedAt: application.submittedAt,
      decidedAt: application.decidedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string' &&
      error.code === 'P2002'
    );
  }
}

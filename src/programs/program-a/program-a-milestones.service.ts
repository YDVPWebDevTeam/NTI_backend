import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { ApplicationAccessService } from '../../applications/application-access.service';
import { ApplicationsRepository } from '../../applications/applications.repository';
import { ProgramAMilestonesRepository } from './program-a-milestones.repository';
import { loadWorkflowApplicationOrThrow } from '../../applications/application-workflow.helpers';
import { toProgramAMilestoneDto } from '../../applications/application.mappers';
import { CreateProgramAMilestoneDto } from './dto/create-program-a-milestone.dto';
import { UpdateProgramAMilestoneDto } from './dto/update-program-a-milestone.dto';
import { ProgramAMilestoneDto } from './dto/program-a-milestone.dto';
import { APPLICATIONS_MESSAGES } from '../../applications/applications.messages';

@Injectable()
export class ProgramAMilestonesService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly programAMilestonesRepository: ProgramAMilestonesRepository,
    private readonly applicationAccess: ApplicationAccessService,
  ) {}

  async createProgramAMilestone(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: CreateProgramAMilestoneDto,
  ): Promise<ProgramAMilestoneDto> {
    return this.applicationsRepository.transaction(async (db) => {
      const application = await loadWorkflowApplicationOrThrow(
        this.applicationsRepository,
        applicationId,
        db,
      );

      this.applicationAccess.ensureProgramATrackingWorkflow(application);
      this.applicationAccess.ensureProgramATrackingAccess(application, user);
      this.applicationAccess.ensureArchivedApplicationIsReadOnlyForNonAdmin(
        application,
        user,
      );

      const title = dto.title.trim();
      if (title.length === 0) {
        throw new BadRequestException(
          APPLICATIONS_MESSAGES.MILESTONE_TITLE_CANNOT_BE_EMPTY,
        );
      }

      const milestone = await this.programAMilestonesRepository.createMilestone(
        {
          applicationId: application.id,
          title,
          description: dto.description?.trim() || null,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
          status: dto.status,
          progressNote: dto.progressNote?.trim() || null,
        },
        db,
      );

      return toProgramAMilestoneDto(milestone);
    });
  }

  async listProgramAMilestones(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramAMilestoneDto[]> {
    const application = await loadWorkflowApplicationOrThrow(
      this.applicationsRepository,
      applicationId,
    );

    this.applicationAccess.ensureProgramATrackingWorkflow(application);
    this.applicationAccess.ensureProgramATrackingReadAccess(application, user);

    const milestones =
      await this.programAMilestonesRepository.listByApplication(application.id);

    return milestones.map((milestone) => toProgramAMilestoneDto(milestone));
  }

  async updateProgramAMilestone(
    applicationId: string,
    milestoneId: string,
    user: AuthenticatedUserContext,
    dto: UpdateProgramAMilestoneDto,
  ): Promise<ProgramAMilestoneDto> {
    return this.applicationsRepository.transaction(async (db) => {
      const application = await loadWorkflowApplicationOrThrow(
        this.applicationsRepository,
        applicationId,
        db,
      );

      this.applicationAccess.ensureProgramATrackingWorkflow(application);
      this.applicationAccess.ensureProgramATrackingAccess(application, user);
      this.applicationAccess.ensureArchivedApplicationIsReadOnlyForNonAdmin(
        application,
        user,
      );

      const existing =
        await this.programAMilestonesRepository.findByIdForApplication(
          application.id,
          milestoneId,
          db,
        );

      if (!existing) {
        throw new NotFoundException(
          APPLICATIONS_MESSAGES.PROGRAM_A_MILESTONE_NOT_FOUND,
        );
      }

      const trimmedTitle = dto.title?.trim();
      if (
        dto.title !== undefined &&
        (!trimmedTitle || trimmedTitle.length === 0)
      ) {
        throw new BadRequestException(
          APPLICATIONS_MESSAGES.MILESTONE_TITLE_CANNOT_BE_EMPTY,
        );
      }

      const milestone = await this.programAMilestonesRepository.updateMilestone(
        existing.id,
        {
          ...(dto.title !== undefined ? { title: trimmedTitle! } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
          ...(dto.dueAt !== undefined
            ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.progressNote !== undefined
            ? { progressNote: dto.progressNote?.trim() || null }
            : {}),
        },
        db,
      );

      return toProgramAMilestoneDto(milestone);
    });
  }
}

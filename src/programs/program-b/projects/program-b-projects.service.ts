import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  ProgramBMilestoneStatus,
  ProgramBProjectStatus,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../../common/types/auth-user-context.type';
import type { PrismaDbClient } from '../../../infrastructure/database';
import { TeamRepository } from '../../../team/team.repository';
import { UserRepository } from '../../../user/user.repository';
import {
  CreateProgramBFinalAcceptanceDto,
  ProgramBFinalAcceptanceSide,
} from './dto/create-program-b-final-acceptance.dto';
import { CreateProgramBMentoringNoteDto } from './dto/create-program-b-mentoring-note.dto';
import { CreateProgramBMilestoneDto } from './dto/create-program-b-milestone.dto';
import { CreateProgramBPoReviewDto } from './dto/create-program-b-po-review.dto';
import { UpdateProgramBMilestoneDto } from './dto/update-program-b-milestone.dto';
import {
  ProgramBProjectExecutionView,
  ProgramBProjectsRepository,
} from './program-b-projects.repository';

@Injectable()
export class ProgramBProjectsService {
  private readonly projectWriteTransactionOptions = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  } as const;

  constructor(
    private readonly projectsRepository: ProgramBProjectsRepository,
    private readonly userRepository: UserRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  async createMilestone(
    projectId: string,
    dto: CreateProgramBMilestoneDto,
    user: AuthenticatedUserContext,
  ) {
    return this.projectsRepository.transaction(async (db) => {
      const project = await this.loadProjectOrThrow(projectId, db);

      this.ensureProjectWritable(project);
      await this.ensureCompanySideProjectMember(project, user, db);

      return this.projectsRepository.createMilestone(
        {
          projectId: project.id,
          title: dto.title,
          description: dto.description,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
          status: dto.status ?? ProgramBMilestoneStatus.PLANNED,
        },
        db,
      );
    }, this.projectWriteTransactionOptions);
  }

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    dto: UpdateProgramBMilestoneDto,
    user: AuthenticatedUserContext,
  ) {
    const updateData = this.buildMilestoneUpdateData(dto);

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Request body is empty');
    }

    return this.projectsRepository.transaction(async (db) => {
      const project = await this.loadProjectOrThrow(projectId, db);

      this.ensureProjectWritable(project);
      await this.ensureCompanySideProjectMember(project, user, db);

      const result = await this.projectsRepository.updateMilestoneForProject(
        project.id,
        milestoneId,
        updateData,
        db,
      );

      if (result.count === 0) {
        throw new NotFoundException('Milestone not found');
      }

      const milestone = await this.projectsRepository.findMilestoneForProject(
        project.id,
        milestoneId,
        db,
      );

      if (!milestone) {
        throw new NotFoundException('Milestone not found');
      }

      return milestone;
    }, this.projectWriteTransactionOptions);
  }

  async createMentoringNote(
    projectId: string,
    dto: CreateProgramBMentoringNoteDto,
    user: AuthenticatedUserContext,
  ) {
    return this.projectsRepository.transaction(async (db) => {
      const project = await this.loadProjectOrThrow(projectId, db);

      this.ensureProjectWritable(project);
      this.ensureMentoringNoteAuthor(project, user);

      return this.projectsRepository.createMentoringNote(
        {
          projectId: project.id,
          authorUserId: user.id,
          note: dto.note,
        },
        db,
      );
    }, this.projectWriteTransactionOptions);
  }

  async createPoReview(
    projectId: string,
    dto: CreateProgramBPoReviewDto,
    user: AuthenticatedUserContext,
  ) {
    return this.projectsRepository.transaction(async (db) => {
      const project = await this.loadProjectOrThrow(projectId, db);

      this.ensureProjectWritable(project);
      this.ensureActiveAssignedProductOwner(project, user);

      return this.projectsRepository.createPoReview(
        {
          projectId: project.id,
          authorUserId: user.id,
          decision: dto.decision,
          comment: dto.comment,
        },
        db,
      );
    }, this.projectWriteTransactionOptions);
  }

  async recordFinalAcceptance(
    projectId: string,
    dto: CreateProgramBFinalAcceptanceDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBProjectExecutionView> {
    return this.projectsRepository.transaction(async (db) => {
      const project = await this.loadProjectOrThrow(projectId, db);

      this.ensureProjectWritableForAcceptance(project, dto.side);

      if (dto.side === ProgramBFinalAcceptanceSide.COMPANY) {
        await this.ensureCompanyAcceptanceAuthor(project, user, db);
        return this.recordCompanyAcceptance(project, db);
      }

      this.ensureNtiAcceptanceAuthor(user);
      return this.recordNtiAcceptance(project, db);
    }, this.projectWriteTransactionOptions);
  }

  private async loadProjectOrThrow(
    projectId: string,
    db?: PrismaDbClient,
  ): Promise<ProgramBProjectExecutionView> {
    const project = await this.projectsRepository.findProjectForExecution(
      projectId,
      db,
    );

    if (!project) {
      throw new NotFoundException('Program B project not found');
    }

    return project;
  }

  private ensureProjectWritable(project: ProgramBProjectExecutionView): void {
    if (project.status === ProgramBProjectStatus.CLOSED) {
      throw new ConflictException('Closed Program B projects are read-only');
    }
  }

  private async ensureCompanySideProjectMember(
    project: ProgramBProjectExecutionView,
    user: AuthenticatedUserContext,
    db?: PrismaDbClient,
  ): Promise<void> {
    const allowedRoles: UserRole[] = [
      UserRole.COMPANY_OWNER,
      UserRole.COMPANY_EMPLOYEE,
    ];

    if (
      user.status !== UserStatus.ACTIVE ||
      !allowedRoles.includes(user.role) ||
      user.organizationId !== project.backlogItem.organizationId
    ) {
      throw new ForbiddenException(
        'Only company-side project members may manage milestones',
      );
    }

    const organizationMember =
      await this.userRepository.findActiveOrganizationMember(
        project.backlogItem.organizationId,
        user.id,
        db,
      );

    if (!organizationMember) {
      throw new ForbiddenException(
        'Only company-side project members may manage milestones',
      );
    }

    if (user.role === UserRole.COMPANY_OWNER) {
      return;
    }

    const teamMember = await this.teamRepository.findMember(
      project.teamId,
      user.id,
      db,
    );

    if (!teamMember) {
      throw new ForbiddenException(
        'Only company-side project members may manage milestones',
      );
    }
  }

  private ensureMentoringNoteAuthor(
    project: ProgramBProjectExecutionView,
    user: AuthenticatedUserContext,
  ): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Only NTI-side reviewers and mentors may create mentoring notes',
      );
    }

    const globalReviewerRoles: UserRole[] = [
      UserRole.EVALUATOR,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ];

    if (globalReviewerRoles.includes(user.role)) {
      return;
    }

    if (
      user.role === UserRole.MENTOR &&
      project.application.mentorUserId === user.id
    ) {
      return;
    }

    throw new ForbiddenException(
      'Only NTI-side reviewers and assigned mentors may create mentoring notes',
    );
  }

  private ensureActiveAssignedProductOwner(
    project: ProgramBProjectExecutionView,
    user: AuthenticatedUserContext,
  ): void {
    if (
      user.status !== UserStatus.ACTIVE ||
      project.productOwnerUserId !== user.id
    ) {
      throw new ForbiddenException(
        'Only the active assigned product owner may create PO reviews',
      );
    }
  }

  private async ensureCompanyAcceptanceAuthor(
    project: ProgramBProjectExecutionView,
    user: AuthenticatedUserContext,
    db?: PrismaDbClient,
  ): Promise<void> {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Only the product owner or same-organization company owner may record company acceptance',
      );
    }

    const isProductOwner = project.productOwnerUserId === user.id;

    if (isProductOwner) {
      return;
    }

    const isCompanyOwnerFromSameOrganization =
      user.role === UserRole.COMPANY_OWNER &&
      user.organizationId === project.backlogItem.organizationId;

    if (!isCompanyOwnerFromSameOrganization) {
      throw new ForbiddenException(
        'Only the product owner or same-organization company owner may record company acceptance',
      );
    }

    const organizationMember =
      await this.userRepository.findActiveOrganizationMember(
        project.backlogItem.organizationId,
        user.id,
        db,
      );

    if (!organizationMember) {
      throw new ForbiddenException(
        'Only the product owner or same-organization company owner may record company acceptance',
      );
    }
  }

  private ensureNtiAcceptanceAuthor(user: AuthenticatedUserContext): void {
    if (
      user.status !== UserStatus.ACTIVE ||
      (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)
    ) {
      throw new ForbiddenException(
        'Only ADMIN or SUPER_ADMIN may record NTI acceptance',
      );
    }
  }

  private async recordCompanyAcceptance(
    project: ProgramBProjectExecutionView,
    db: PrismaDbClient,
  ): Promise<ProgramBProjectExecutionView> {
    if (project.acceptedByCompanyAt) {
      return project;
    }

    this.ensureProjectWritable(project);

    const now = new Date();
    const willClose = Boolean(project.acceptedByNtiAt);

    return this.projectsRepository.acceptProjectByCompany(
      project.id,
      now,
      willClose,
      db,
    );
  }

  private async recordNtiAcceptance(
    project: ProgramBProjectExecutionView,
    db: PrismaDbClient,
  ): Promise<ProgramBProjectExecutionView> {
    if (project.acceptedByNtiAt) {
      return project;
    }

    this.ensureProjectWritable(project);

    const now = new Date();
    const willClose = Boolean(project.acceptedByCompanyAt);

    return this.projectsRepository.acceptProjectByNti(
      project.id,
      now,
      willClose,
      db,
    );
  }

  private ensureProjectWritableForAcceptance(
    project: ProgramBProjectExecutionView,
    side: ProgramBFinalAcceptanceSide,
  ): void {
    const isIdempotentCompanyAcceptance =
      side === ProgramBFinalAcceptanceSide.COMPANY &&
      project.acceptedByCompanyAt !== null;

    const isIdempotentNtiAcceptance =
      side === ProgramBFinalAcceptanceSide.NTI &&
      project.acceptedByNtiAt !== null;

    if (isIdempotentCompanyAcceptance || isIdempotentNtiAcceptance) {
      return;
    }

    this.ensureProjectWritable(project);
  }

  private buildMilestoneUpdateData(
    dto: UpdateProgramBMilestoneDto,
  ): Prisma.ProgramBMilestoneUncheckedUpdateInput {
    const updateData: Prisma.ProgramBMilestoneUncheckedUpdateInput = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.dueAt !== undefined) {
      updateData.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    return updateData;
  }
}

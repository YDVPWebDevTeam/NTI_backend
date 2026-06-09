import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  BacklogItemStatus,
  FileVisibility,
  ProgramBDocumentVisibility,
  ProgramBMilestoneStatus,
  ProgramBProjectDocumentCategory,
  ProgramBProjectStatus,
  UploadStatus,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import {
  isReviewerRole,
  isSameOrgCompanyMember,
} from '../../../common/auth/role-groups';
import { SERIALIZABLE_TX_OPTIONS } from '../../../common/prisma/transaction.constants';
import { toProgramBDocumentDto } from '../common/program-b-document.mapper';
import { isPrismaUniqueConstraintError } from '../../../common/prisma/prisma-error.utils';
import type { AuthenticatedUserContext } from '../../../common/types/auth-user-context.type';
import type { PrismaDbClient } from '../../../infrastructure/database';
import { QueueService } from '../../../infrastructure/queue/queue.service';
import { EMAIL_JOBS } from '../../../infrastructure/queue/queue.types';
import { R2StorageService } from '../../../infrastructure/storage';
import { FilesService } from '../../../files';
import { UserRepository } from '../../../user/user.repository';
import { CompleteProgramBDocumentUploadDto } from '../backlog/dto/complete-program-b-document-upload.dto';
import { ProgramBDocumentDownloadDto } from '../backlog/dto/program-b-backlog-document.dto';
import { ProgramBAssignableMentorDto } from './dto/program-b-assignable-mentor.dto';
import { AssignProgramBMentorDto } from './dto/assign-program-b-mentor.dto';
import {
  CreateProgramBFinalAcceptanceDto,
  ProgramBFinalAcceptanceSide,
} from './dto/create-program-b-final-acceptance.dto';
import { CreateProgramBMentoringNoteDto } from './dto/create-program-b-mentoring-note.dto';
import { CreateProgramBMilestoneDto } from './dto/create-program-b-milestone.dto';
import { CreateProgramBPoReviewDto } from './dto/create-program-b-po-review.dto';
import { CreateProgramBProjectDocumentUploadDto } from './dto/create-program-b-project-document-upload.dto';
import {
  ProgramBMentoringNoteDto,
  ProgramBMilestoneDto,
  ProgramBPoReviewDto,
  ProgramBProjectDetailDto,
} from './dto/program-b-project-detail.dto';
import {
  ProgramBProjectDocumentDto,
  ProgramBProjectDocumentUploadDto,
} from './dto/program-b-project-document.dto';
import { UpdateProgramBMilestoneDto } from './dto/update-program-b-milestone.dto';
import { UpdateProgramBProjectRewardDto } from './dto/update-program-b-project-reward.dto';
import {
  ProgramBProjectDetailView,
  ProgramBProjectExecutionView,
  ProgramBProjectsRepository,
} from './program-b-projects.repository';
import { PROGRAM_B_PROJECTS_MESSAGES } from './program-b-projects.messages';

@Injectable()
export class ProgramBProjectsService {
  private readonly projectWriteTransactionOptions = SERIALIZABLE_TX_OPTIONS;

  constructor(
    private readonly projectsRepository: ProgramBProjectsRepository,
    private readonly userRepository: UserRepository,
    private readonly filesService: FilesService,
    private readonly storageService: R2StorageService,
    private readonly queueService: QueueService,
  ) {}

  async listMy(
    user: AuthenticatedUserContext,
  ): Promise<ProgramBProjectDetailDto[]> {
    this.ensureProjectListRoleAllowed(user);

    const projects = await this.projectsRepository.listProjectsForUser(user);
    return projects.map((project) => this.toProjectDetailDto(project));
  }

  async getProjectDetail(
    projectId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBProjectDetailDto> {
    const project = await this.loadProjectDetailOrThrow(projectId);
    this.ensureProjectReadable(project, user);
    return this.toProjectDetailDto(project);
  }

  async listMilestones(
    projectId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBMilestoneDto[]> {
    const project = await this.loadProjectDetailOrThrow(projectId);
    this.ensureProjectReadable(project, user);
    const milestones = await this.projectsRepository.listMilestones(projectId);

    return milestones.map((milestone) => this.toMilestoneDto(milestone));
  }

  async createMilestone(
    projectId: string,
    dto: CreateProgramBMilestoneDto,
    user: AuthenticatedUserContext,
  ) {
    return this.projectsRepository.transaction(async (db) => {
      const project = await this.loadProjectOrThrow(projectId, db);

      this.ensureProjectWritable(project);
      await this.ensureMilestoneManagementAccess(project, user, db);
      await this.promoteBacklogToRealizationIfNeeded(project, db);

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
      throw new BadRequestException(
        PROGRAM_B_PROJECTS_MESSAGES.REQUEST_BODY_EMPTY,
      );
    }

    return this.projectsRepository.transaction(async (db) => {
      const project = await this.loadProjectOrThrow(projectId, db);

      this.ensureProjectWritable(project);
      await this.ensureMilestoneManagementAccess(project, user, db);
      await this.promoteBacklogToRealizationIfNeeded(project, db);

      const result = await this.projectsRepository.updateMilestoneForProject(
        project.id,
        milestoneId,
        updateData,
        db,
      );

      if (result.count === 0) {
        throw new NotFoundException(
          PROGRAM_B_PROJECTS_MESSAGES.MILESTONE_NOT_FOUND,
        );
      }

      const milestone = await this.projectsRepository.findMilestoneForProject(
        project.id,
        milestoneId,
        db,
      );

      if (!milestone) {
        throw new NotFoundException(
          PROGRAM_B_PROJECTS_MESSAGES.MILESTONE_NOT_FOUND,
        );
      }

      return milestone;
    }, this.projectWriteTransactionOptions);
  }

  async listMentoringNotes(
    projectId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBMentoringNoteDto[]> {
    const project = await this.loadProjectDetailOrThrow(projectId);
    this.ensureProjectReadable(project, user);
    const notes = await this.projectsRepository.listMentoringNotes(projectId);

    return notes.map((note) => ({
      id: note.id,
      note: note.note,
      author: note.authorUser,
      createdAt: note.createdAt,
    }));
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
      await this.promoteBacklogToRealizationIfNeeded(project, db);

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

  async listPoReviews(
    projectId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBPoReviewDto[]> {
    const project = await this.loadProjectDetailOrThrow(projectId);
    this.ensureProjectReadable(project, user);
    const reviews = await this.projectsRepository.listPoReviews(projectId);

    return reviews.map((review) => ({
      id: review.id,
      decision: review.decision,
      comment: review.comment ?? undefined,
      author: review.authorUser,
      createdAt: review.createdAt,
    }));
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
      await this.promoteBacklogToRealizationIfNeeded(project, db);

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

  async listDocuments(
    projectId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBProjectDocumentDto[]> {
    const project = await this.loadProjectDetailOrThrow(projectId);
    this.ensureProjectReadable(project, user);
    const documents =
      await this.projectsRepository.listProjectDocuments(projectId);
    return documents.map((document) => this.toProjectDocumentDto(document));
  }

  async createDocumentUpload(
    projectId: string,
    dto: CreateProgramBProjectDocumentUploadDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBProjectDocumentUploadDto> {
    const project = await this.loadProjectDetailOrThrow(projectId);
    this.ensureProjectDocumentWriteAccess(project, user);

    const upload = await this.filesService.requestUpload(user, {
      filename: dto.filename,
      mimeType: dto.mimeType,
      size: dto.size,
      visibility: FileVisibility.PRIVATE,
      purpose: 'program-b-project-document',
      entityType: 'ProgramBProjectDocument',
      entityId: projectId,
    });

    const document = await this.createProjectDocumentWithNextVersion(
      projectId,
      upload.fileId,
      dto,
      user.id,
    );

    return {
      documentId: document.id,
      fileId: upload.fileId,
      uploadUrl: upload.uploadUrl,
      expiresAt: upload.expiresAt,
    };
  }

  async completeDocumentUpload(
    projectId: string,
    documentId: string,
    dto: CompleteProgramBDocumentUploadDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBProjectDocumentDto> {
    const project = await this.loadProjectDetailOrThrow(projectId);
    this.ensureProjectDocumentWriteAccess(project, user);

    const document = await this.getProjectDocumentOrThrow(
      projectId,
      documentId,
    );

    await this.filesService.completeUpload(user, {
      fileId: document.uploadedFile.id,
      size: dto.size,
      checksum: dto.checksum,
    });

    const completedDocument = await this.getProjectDocumentOrThrow(
      projectId,
      documentId,
    );
    return this.toProjectDocumentDto(completedDocument);
  }

  async requestDocumentDownload(
    projectId: string,
    documentId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBDocumentDownloadDto> {
    const project = await this.loadProjectDetailOrThrow(projectId);
    this.ensureProjectReadable(project, user);

    const document = await this.getProjectDocumentOrThrow(
      projectId,
      documentId,
    );

    if (document.uploadedFile.status !== UploadStatus.UPLOADED) {
      throw new ConflictException(
        PROGRAM_B_PROJECTS_MESSAGES.DOCUMENT_NOT_AVAILABLE_FOR_READING,
      );
    }

    const downloadUrl = await this.storageService.createPresignedDownloadUrl({
      key: document.uploadedFile.key,
      filename: document.uploadedFile.originalName,
      disposition: 'attachment',
    });

    return {
      documentId: document.id,
      downloadUrl,
    };
  }

  async assignMentor(
    projectId: string,
    dto: AssignProgramBMentorDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBProjectDetailDto> {
    this.ensureMentorAssignmentAuthor(user);

    const updatedProject = await this.projectsRepository.transaction(
      async (db) => {
        const project = await this.loadProjectOrThrow(projectId, db);

        const mentor = await this.userRepository.findUnique(
          { id: dto.mentorUserId },
          db,
        );

        if (!mentor) {
          throw new NotFoundException(
            PROGRAM_B_PROJECTS_MESSAGES.MENTOR_USER_NOT_FOUND,
          );
        }

        if (
          mentor.role !== UserRole.MENTOR ||
          mentor.status !== UserStatus.ACTIVE
        ) {
          throw new BadRequestException(
            PROGRAM_B_PROJECTS_MESSAGES.TARGET_USER_MUST_BE_ACTIVE_MENTOR,
          );
        }

        await this.projectsRepository.updateProject(
          project.id,
          {
            mentorUserId: mentor.id,
            mentorAssignedAt: new Date(),
            mentorAssignedById: user.id,
          },
          db,
        );

        await this.promoteBacklogToRealizationIfNeeded(project, db);

        const updatedProject = await this.projectsRepository.findProjectDetail(
          project.id,
          db,
        );

        if (!updatedProject) {
          throw new NotFoundException(
            PROGRAM_B_PROJECTS_MESSAGES.PROJECT_NOT_FOUND,
          );
        }

        return updatedProject;
      },
      this.projectWriteTransactionOptions,
    );

    await this.enqueueMentorAssignedEmails(updatedProject);

    return this.toProjectDetailDto(updatedProject);
  }

  private async enqueueMentorAssignedEmails(
    project: ProgramBProjectDetailView,
  ): Promise<void> {
    const recipientEmails = [
      ...new Set(
        [
          project.mentorUser?.email,
          ...(project.team?.members.map((member) => member.user.email) ?? []),
        ].filter((email): email is string => Boolean(email)),
      ),
    ];

    if (recipientEmails.length === 0) {
      return;
    }

    await Promise.all(
      recipientEmails.map((email) =>
        this.queueService.addEmail(EMAIL_JOBS.PROGRAM_B_MENTOR_ASSIGNED, {
          email,
          projectId: project.id,
          backlogTitle: project.backlogItem.title ?? '',
          teamName: project.team?.name ?? '',
        }),
      ),
    );
  }

  async listAssignableMentors(
    user: AuthenticatedUserContext,
  ): Promise<ProgramBAssignableMentorDto[]> {
    this.ensureMentorAssignmentAuthor(user);

    const mentors = await this.userRepository.findActiveMentors();

    return mentors.map((mentor) => ({
      id: mentor.id,
      firstName: mentor.firstName,
      lastName: mentor.lastName,
      email: mentor.email,
    }));
  }

  async recordFinalAcceptance(
    projectId: string,
    dto: CreateProgramBFinalAcceptanceDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBProjectDetailDto> {
    return this.projectsRepository.transaction(async (db) => {
      const project = await this.loadProjectOrThrow(projectId, db);

      this.ensureProjectWritableForAcceptance(project, dto.side);

      if (dto.side === ProgramBFinalAcceptanceSide.COMPANY) {
        await this.ensureCompanyAcceptanceAuthor(project, user, db);
        await this.recordCompanyAcceptance(project, db);
      } else {
        this.ensureNtiAcceptanceAuthor(user);
        await this.recordNtiAcceptance(project, db);
      }

      const refreshedProject =
        await this.projectsRepository.findProjectForExecution(projectId, db);

      if (!refreshedProject) {
        throw new NotFoundException(
          PROGRAM_B_PROJECTS_MESSAGES.PROJECT_NOT_FOUND,
        );
      }

      if (
        refreshedProject.acceptedByCompanyAt &&
        refreshedProject.acceptedByNtiAt
      ) {
        await this.projectsRepository.updateBacklogStatusForProject(
          refreshedProject.backlogItemId,
          BacklogItemStatus.CLOSED,
          db,
        );
      }

      const detail = await this.projectsRepository.findProjectDetail(
        projectId,
        db,
      );

      if (!detail) {
        throw new NotFoundException(
          PROGRAM_B_PROJECTS_MESSAGES.PROJECT_NOT_FOUND,
        );
      }

      return this.toProjectDetailDto(detail);
    }, this.projectWriteTransactionOptions);
  }

  async updateReward(
    projectId: string,
    dto: UpdateProgramBProjectRewardDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBProjectDetailDto> {
    return this.projectsRepository.transaction(async (db) => {
      const project = await this.loadProjectOrThrow(projectId, db);

      this.ensureProjectWritable(project);

      if (!isReviewerRole(user.role)) {
        await this.ensureCompanySideProjectMember(project, user, db);
      }

      await this.projectsRepository.updateProject(
        project.id,
        { rewardPerMember: dto.rewardPerMember ?? null },
        db,
      );

      const detail = await this.projectsRepository.findProjectDetail(
        projectId,
        db,
      );

      if (!detail) {
        throw new NotFoundException(
          PROGRAM_B_PROJECTS_MESSAGES.PROJECT_NOT_FOUND,
        );
      }

      return this.toProjectDetailDto(detail);
    }, this.projectWriteTransactionOptions);
  }

  private ensureProjectListRoleAllowed(user: AuthenticatedUserContext): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException();
    }
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
      throw new NotFoundException(
        PROGRAM_B_PROJECTS_MESSAGES.PROJECT_NOT_FOUND,
      );
    }

    return project;
  }

  private async loadProjectDetailOrThrow(
    projectId: string,
    db?: PrismaDbClient,
  ): Promise<ProgramBProjectDetailView> {
    const project = await this.projectsRepository.findProjectDetail(
      projectId,
      db,
    );

    if (!project) {
      throw new NotFoundException(
        PROGRAM_B_PROJECTS_MESSAGES.PROJECT_NOT_FOUND,
      );
    }

    return project;
  }

  private ensureProjectReadable(
    project: ProgramBProjectDetailView,
    user: AuthenticatedUserContext,
  ): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException();
    }

    if (isReviewerRole(user.role)) {
      return;
    }

    if (isSameOrgCompanyMember(user, project.backlogItem.organizationId)) {
      return;
    }

    if (user.role === UserRole.MENTOR && project.mentorUserId === user.id) {
      return;
    }

    if (
      user.role === UserRole.STUDENT &&
      project.team.members.some((member) => member.user.id === user.id)
    ) {
      return;
    }

    throw new ForbiddenException();
  }

  private ensureProjectWritable(project: ProgramBProjectExecutionView): void {
    if (project.status === ProgramBProjectStatus.CLOSED) {
      throw new ConflictException(
        PROGRAM_B_PROJECTS_MESSAGES.CLOSED_PROJECTS_ARE_READ_ONLY,
      );
    }
  }

  private async ensureMilestoneManagementAccess(
    project: ProgramBProjectExecutionView,
    user: AuthenticatedUserContext,
    db?: PrismaDbClient,
  ): Promise<void> {
    const forbiddenMessage =
      PROGRAM_B_PROJECTS_MESSAGES.ONLY_COMPANY_MEMBERS_OR_ASSIGNED_MENTORS_MAY_MANAGE_MILESTONES;

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(forbiddenMessage);
    }

    const isAssignedMentor =
      user.role === UserRole.MENTOR && project.mentorUserId === user.id;

    if (isAssignedMentor) {
      return;
    }

    if (!isSameOrgCompanyMember(user, project.backlogItem.organizationId)) {
      throw new ForbiddenException(forbiddenMessage);
    }

    const organizationMember =
      await this.userRepository.findActiveOrganizationMember(
        project.backlogItem.organizationId,
        user.id,
        db,
      );

    if (!organizationMember) {
      throw new ForbiddenException(forbiddenMessage);
    }
  }

  private async ensureCompanySideProjectMember(
    project: ProgramBProjectExecutionView,
    user: AuthenticatedUserContext,
    db?: PrismaDbClient,
  ): Promise<void> {
    if (
      user.status !== UserStatus.ACTIVE ||
      !isSameOrgCompanyMember(user, project.backlogItem.organizationId)
    ) {
      throw new ForbiddenException(
        PROGRAM_B_PROJECTS_MESSAGES.ONLY_COMPANY_MEMBERS_MAY_MANAGE_MILESTONES,
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
        PROGRAM_B_PROJECTS_MESSAGES.ONLY_COMPANY_MEMBERS_MAY_MANAGE_MILESTONES,
      );
    }
  }

  private ensureMentoringNoteAuthor(
    project: ProgramBProjectExecutionView,
    user: AuthenticatedUserContext,
  ): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        PROGRAM_B_PROJECTS_MESSAGES.ONLY_REVIEWERS_AND_MENTORS_MAY_CREATE_NOTES,
      );
    }

    if (isReviewerRole(user.role)) {
      return;
    }

    if (user.role === UserRole.MENTOR && project.mentorUserId === user.id) {
      return;
    }

    throw new ForbiddenException(
      PROGRAM_B_PROJECTS_MESSAGES.ONLY_REVIEWERS_AND_ASSIGNED_MENTORS_MAY_CREATE_NOTES,
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
        PROGRAM_B_PROJECTS_MESSAGES.ONLY_ACTIVE_PO_MAY_CREATE_PO_REVIEWS,
      );
    }
  }

  private ensureProjectDocumentWriteAccess(
    project: ProgramBProjectDetailView,
    user: AuthenticatedUserContext,
  ): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException();
    }

    if (isSameOrgCompanyMember(user, project.backlogItem.organizationId)) {
      return;
    }

    if (
      user.role === UserRole.STUDENT &&
      project.team.members.some((member) => member.user.id === user.id)
    ) {
      return;
    }

    throw new ForbiddenException();
  }

  private ensureMentorAssignmentAuthor(user: AuthenticatedUserContext): void {
    if (user.status !== UserStatus.ACTIVE || !isReviewerRole(user.role)) {
      throw new ForbiddenException(
        PROGRAM_B_PROJECTS_MESSAGES.ONLY_REVIEWERS_MAY_ASSIGN_MENTOR,
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
        PROGRAM_B_PROJECTS_MESSAGES.ONLY_PO_OR_COMPANY_OWNER_MAY_RECORD_ACCEPTANCE,
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
        PROGRAM_B_PROJECTS_MESSAGES.ONLY_PO_OR_COMPANY_OWNER_MAY_RECORD_ACCEPTANCE,
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
        PROGRAM_B_PROJECTS_MESSAGES.ONLY_PO_OR_COMPANY_OWNER_MAY_RECORD_ACCEPTANCE,
      );
    }
  }

  private ensureNtiAcceptanceAuthor(user: AuthenticatedUserContext): void {
    if (user.status !== UserStatus.ACTIVE || !isReviewerRole(user.role)) {
      throw new ForbiddenException(
        PROGRAM_B_PROJECTS_MESSAGES.ONLY_REVIEWERS_MAY_RECORD_NTI_ACCEPTANCE,
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

  private async promoteBacklogToRealizationIfNeeded(
    project: ProgramBProjectExecutionView,
    db: PrismaDbClient,
  ): Promise<void> {
    if (project.backlogItem.status === BacklogItemStatus.ASSIGNED) {
      await this.projectsRepository.updateBacklogStatusForProject(
        project.backlogItemId,
        BacklogItemStatus.IN_REALIZATION,
        db,
      );
    }
  }

  private async createProjectDocumentWithNextVersion(
    projectId: string,
    uploadedFileId: string,
    dto: CreateProgramBProjectDocumentUploadDto,
    createdById: string,
  ) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.projectsRepository.transaction(async (db) => {
          const currentDocuments =
            await this.projectsRepository.listProjectDocuments(projectId, db);
          const version =
            Math.max(
              0,
              ...currentDocuments
                .filter((document) => document.category === dto.category)
                .map((document) => document.version),
            ) + 1;

          return this.projectsRepository.createProjectDocument(
            {
              projectId,
              uploadedFileId,
              category: dto.category,
              visibility: dto.visibility,
              version,
              createdById,
            },
            db,
          );
        }, this.projectWriteTransactionOptions);
      } catch (error) {
        if (attempt === 0 && isPrismaUniqueConstraintError(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException(
      PROGRAM_B_PROJECTS_MESSAGES.DOCUMENT_VERSION_CONFLICT,
    );
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

  private async getProjectDocumentOrThrow(
    projectId: string,
    documentId: string,
  ) {
    const document =
      await this.projectsRepository.findProjectDocumentById(documentId);

    if (!document || document.projectId !== projectId) {
      throw new NotFoundException(
        PROGRAM_B_PROJECTS_MESSAGES.PROJECT_DOCUMENT_NOT_FOUND,
      );
    }

    return document;
  }

  private toProjectDocumentDto(document: {
    id: string;
    category: ProgramBProjectDocumentCategory;
    visibility: ProgramBDocumentVisibility;
    version: number;
    createdAt: Date;
    uploadedFile: {
      id: string;
      originalName: string;
      mimeType: string;
      size: number;
      status: UploadStatus;
      uploadedAt: Date | null;
    };
  }): ProgramBProjectDocumentDto {
    return toProgramBDocumentDto(document);
  }

  private toMilestoneDto(milestone: {
    id: string;
    title: string;
    description: string | null;
    dueAt: Date | null;
    status: ProgramBMilestoneStatus;
    createdAt: Date;
    updatedAt: Date;
  }): ProgramBMilestoneDto {
    return {
      id: milestone.id,
      title: milestone.title,
      description: milestone.description ?? undefined,
      dueAt: milestone.dueAt ?? undefined,
      status: milestone.status,
      createdAt: milestone.createdAt,
      updatedAt: milestone.updatedAt,
    };
  }

  private toPoReviewDto(review: {
    id: string;
    decision: ProgramBPoReviewDto['decision'];
    comment: string | null;
    authorUser: ProgramBPoReviewDto['author'];
    createdAt: Date;
  }): ProgramBPoReviewDto {
    return {
      id: review.id,
      decision: review.decision,
      comment: review.comment ?? undefined,
      author: review.authorUser,
      createdAt: review.createdAt,
    };
  }

  private toProjectDetailDto(
    project: ProgramBProjectDetailView,
  ): ProgramBProjectDetailDto {
    const backlogItem = project.backlogItem as Partial<
      ProgramBProjectDetailView['backlogItem']
    >;
    const team = (
      project as ProgramBProjectDetailView & {
        team?: ProgramBProjectDetailView['team'];
      }
    ).team;
    const productOwner = (
      project as ProgramBProjectDetailView & {
        productOwnerUser?: ProgramBProjectDetailView['productOwnerUser'];
      }
    ).productOwnerUser;

    return {
      id: project.id,
      status: project.status,
      backlogItem: {
        id: backlogItem.id ?? project.backlogItemId,
        organizationId: backlogItem.organizationId ?? '',
        title: backlogItem.title ?? null,
        description: backlogItem.description ?? null,
        budget: backlogItem.budget ?? null,
        expectedOutcomes: backlogItem.expectedOutcomes ?? null,
        productOwnerUserId:
          backlogItem.productOwnerUserId ?? project.productOwnerUserId,
        status:
          (backlogItem.status as ProgramBProjectDetailDto['backlogItem']['status']) ??
          BacklogItemStatus.ASSIGNED,
        organization: backlogItem.organization ?? null,
        productOwner: backlogItem.productOwner ?? undefined,
        documents: (backlogItem.documents ?? []).map((document) => ({
          id: document.id,
          fileId: document.uploadedFile.id,
          category: document.category,
          visibility: document.visibility,
          name: document.uploadedFile.originalName,
          mimeType: document.uploadedFile.mimeType,
          size: document.uploadedFile.size,
          status: document.uploadedFile.status,
          version: document.version,
          uploadedAt: document.uploadedFile.uploadedAt ?? undefined,
          createdAt: document.createdAt,
        })),
        createdAt: backlogItem.createdAt ?? project.createdAt,
        updatedAt: backlogItem.updatedAt ?? project.updatedAt,
      },
      team: {
        id: team?.id ?? project.teamId,
        name: team?.name ?? '',
        members: (team?.members ?? []).map((member) => member.user),
      },
      productOwnerUserId: project.productOwnerUserId,
      productOwner: productOwner ?? {
        id: project.productOwnerUserId,
        firstName: '',
        lastName: '',
      },
      mentorAssignment: {
        mentorUserId: project.mentorUserId ?? undefined,
        mentor: project.mentorUser ?? undefined,
        assignedAt: project.mentorAssignedAt ?? undefined,
        assignedBy: project.mentorAssignedBy ?? undefined,
      },
      acceptedByCompanyAt: project.acceptedByCompanyAt ?? undefined,
      acceptedByNtiAt: project.acceptedByNtiAt ?? undefined,
      rewardPerMember: project.rewardPerMember ?? null,
      milestones: (project.milestones ?? []).map((milestone) =>
        this.toMilestoneDto(milestone),
      ),
      mentoringNotes: (project.mentoringNotes ?? []).map((note) => ({
        id: note.id,
        note: note.note,
        author: note.authorUser,
        createdAt: note.createdAt,
      })),
      poReviews: (project.poReviews ?? []).map((review) =>
        this.toPoReviewDto(review),
      ),
      documents: (project.documents ?? []).map((document) =>
        this.toProjectDocumentDto(document),
      ),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}

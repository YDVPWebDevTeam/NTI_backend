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
  ProgramBMilestoneStatus,
  ProgramBProjectStatus,
  UploadStatus,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import { isPrismaUniqueConstraintError } from '../../../common/prisma/prisma-error.utils';
import type { AuthenticatedUserContext } from '../../../common/types/auth-user-context.type';
import type { PrismaDbClient } from '../../../infrastructure/database';
import { R2StorageService } from '../../../infrastructure/storage';
import { FilesService } from '../../../files';
import { UserRepository } from '../../../user/user.repository';
import { CompleteProgramBDocumentUploadDto } from '../backlog/dto/complete-program-b-document-upload.dto';
import { ProgramBDocumentDownloadDto } from '../backlog/dto/program-b-backlog-document.dto';
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
import {
  ProgramBProjectDetailView,
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
    private readonly filesService: FilesService,
    private readonly storageService: R2StorageService,
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
      await this.ensureCompanySideProjectMember(project, user, db);
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
      throw new BadRequestException('Request body is empty');
    }

    return this.projectsRepository.transaction(async (db) => {
      const project = await this.loadProjectOrThrow(projectId, db);

      this.ensureProjectWritable(project);
      await this.ensureCompanySideProjectMember(project, user, db);
      await this.promoteBacklogToRealizationIfNeeded(project, db);

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
      throw new ConflictException('Document is not available for reading yet');
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

    return this.projectsRepository.transaction(async (db) => {
      const project = await this.loadProjectOrThrow(projectId, db);

      const mentor = await this.userRepository.findUnique(
        { id: dto.mentorUserId },
        db,
      );

      if (!mentor) {
        throw new NotFoundException('Mentor user not found');
      }

      if (
        mentor.role !== UserRole.MENTOR ||
        mentor.status !== UserStatus.ACTIVE
      ) {
        throw new BadRequestException('Target user must be an active mentor');
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
        throw new NotFoundException('Program B project not found');
      }

      return this.toProjectDetailDto(updatedProject);
    }, this.projectWriteTransactionOptions);
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
        throw new NotFoundException('Program B project not found');
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
        throw new NotFoundException('Program B project not found');
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
      throw new NotFoundException('Program B project not found');
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
      throw new NotFoundException('Program B project not found');
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

    if (
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.EVALUATOR
    ) {
      return;
    }

    if (
      (user.role === UserRole.COMPANY_OWNER ||
        user.role === UserRole.COMPANY_EMPLOYEE) &&
      user.organizationId === project.backlogItem.organizationId
    ) {
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

    if (user.role === UserRole.MENTOR && project.mentorUserId === user.id) {
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

  private ensureProjectDocumentWriteAccess(
    project: ProgramBProjectDetailView,
    user: AuthenticatedUserContext,
  ): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException();
    }

    if (
      (user.role === UserRole.COMPANY_OWNER ||
        user.role === UserRole.COMPANY_EMPLOYEE) &&
      user.organizationId === project.backlogItem.organizationId
    ) {
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
    if (
      user.status !== UserStatus.ACTIVE ||
      !(
        [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EVALUATOR] as UserRole[]
      ).includes(user.role)
    ) {
      throw new ForbiddenException(
        'Only NTI-side reviewers may assign a mentor',
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
      (user.role !== UserRole.ADMIN &&
        user.role !== UserRole.SUPER_ADMIN &&
        user.role !== UserRole.EVALUATOR)
    ) {
      throw new ForbiddenException(
        'Only NTI-side reviewers may record NTI acceptance',
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
      'Could not assign a unique document version for this category',
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
      throw new NotFoundException('Program B project document not found');
    }

    return document;
  }

  private toProjectDocumentDto(document: {
    id: string;
    category: unknown;
    visibility: unknown;
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
    return {
      id: document.id,
      fileId: document.uploadedFile.id,
      category: document.category as never,
      visibility: document.visibility as never,
      name: document.uploadedFile.originalName,
      mimeType: document.uploadedFile.mimeType,
      size: document.uploadedFile.size,
      status: document.uploadedFile.status as never,
      version: document.version,
      uploadedAt: document.uploadedFile.uploadedAt ?? undefined,
      createdAt: document.createdAt,
    };
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
        this.toProjectDocumentDto(document as never),
      ),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}

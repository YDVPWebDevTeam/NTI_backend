import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProgramBTeamApplication,
} from '../../../../generated/prisma/client';
import {
  BacklogItemStatus,
  FileVisibility,
  OrganizationStatus,
  ProgramBTeamApplicationStatus,
  UploadStatus,
  UserRole,
  UserStatus,
} from '../../../../generated/prisma/enums';
import { isPrismaUniqueConstraintError } from '../../../common/prisma/prisma-error.utils';
import type { AuthenticatedUserContext } from '../../../common/types/auth-user-context.type';
import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
} from '../../../common/pagination';
import { FilesService } from '../../../files/files.service';
import { PrismaDbClient } from '../../../infrastructure/database';
import { R2StorageService } from '../../../infrastructure/storage';
import { OrganizationRepository } from '../../../organization/organization.repository';
import { UserRepository } from '../../../user/user.repository';
import { ProgramBProjectsRepository } from '../projects/program-b-projects.repository';
import { ProgramBTeamApplicationRepository } from '../team-application/program-b-team-application.repository';
import { AssignProductOwnerDto } from './dto/assign-product-owner.dto';
import { CompleteProgramBDocumentUploadDto } from './dto/complete-program-b-document-upload.dto';
import { CreateProgramBBacklogDocumentUploadDto } from './dto/create-program-b-backlog-document-upload.dto';
import { CreateProgramBBacklogItemDto } from './dto/create-program-b-backlog-item.dto';
import { GetProgramBBacklogQueryDto } from './dto/get-program-b-backlog-query.dto';
import { GetProgramBBacklogResponseDto } from './dto/get-program-b-backlog-response.dto';
import {
  ProgramBBacklogDocumentDto,
  ProgramBBacklogDocumentUploadDto,
  ProgramBDocumentDownloadDto,
} from './dto/program-b-backlog-document.dto';
import { ProgramBBacklogItemDto } from './dto/program-b-backlog-item.dto';
import { ProgramBCandidateDecisionDto } from './dto/program-b-candidate-decision.dto';
import { UpdateProgramBBacklogItemDto } from './dto/update-program-b-backlog-item.dto';
import {
  ProgramBBacklogDetailView,
  ProgramBBacklogRepository,
} from './program-b-backlog.repository';

@Injectable()
export class ProgramBBacklogService {
  private readonly backlogLifecycleTransactionOptions = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  } as const;

  constructor(
    private readonly backlogRepository: ProgramBBacklogRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly teamApplicationRepository: ProgramBTeamApplicationRepository,
    private readonly projectsRepository: ProgramBProjectsRepository,
    private readonly filesService: FilesService,
    private readonly storageService: R2StorageService,
  ) {}

  async create(
    dto: CreateProgramBBacklogItemDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    const organization = await this.ensureActiveOrganizationMember(user);
    await this.ensureProductOwnerFromSameOrganization(
      organization.id,
      dto.productOwnerUserId,
    );

    const created = await this.backlogRepository.create({
      organizationId: organization.id,
      title: dto.title,
      description: dto.description,
      budget: dto.budget,
      expectedOutcomes: dto.expectedOutcomes,
      productOwnerUserId: dto.productOwnerUserId,
      status: BacklogItemStatus.DRAFT,
    });

    const createdItem = await this.backlogRepository.findDetailUnique({
      id: created.id,
    });

    if (!createdItem) {
      throw new NotFoundException('Backlog item not found');
    }

    return this.toBacklogItemDto(createdItem);
  }

  async update(
    id: string,
    dto: UpdateProgramBBacklogItemDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    const organization = await this.ensureActiveOrganizationMember(user);
    const item = await this.getItemForOrganizationOrThrow(id, organization.id);

    if (item.status !== BacklogItemStatus.DRAFT) {
      throw new ConflictException('Only draft backlog items may be updated');
    }

    const updateData: Prisma.BacklogItemUncheckedUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.budget !== undefined) updateData.budget = dto.budget;
    if (dto.expectedOutcomes !== undefined) {
      updateData.expectedOutcomes = dto.expectedOutcomes;
    }

    if (dto.productOwnerUserId !== undefined) {
      await this.ensureProductOwnerFromSameOrganization(
        organization.id,
        dto.productOwnerUserId,
      );
      updateData.productOwnerUserId = dto.productOwnerUserId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Request body is empty');
    }

    return this.backlogRepository.transaction(async (db) => {
      const result = await this.backlogRepository.updateMany(
        { id: item.id, status: BacklogItemStatus.DRAFT },
        updateData,
        db,
      );

      if (result.count === 0) {
        throw new ConflictException('Only draft backlog items may be updated');
      }

      const updatedItem = await this.backlogRepository.findDetailUnique(
        { id: item.id },
        db,
      );

      if (!updatedItem) {
        throw new NotFoundException('Backlog item not found');
      }

      return this.toBacklogItemDto(updatedItem);
    }, this.backlogLifecycleTransactionOptions);
  }

  async remove(
    id: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    const organization = await this.ensureActiveOrganizationMember(user);
    const item = await this.getItemForOrganizationOrThrow(id, organization.id);

    if (item.status !== BacklogItemStatus.DRAFT) {
      throw new ConflictException('Only draft backlog items may be deleted');
    }

    return this.backlogRepository.transaction(async (db) => {
      const deleted = await this.backlogRepository.deleteDraftById(item.id, db);

      if (deleted.count === 0) {
        throw new ConflictException('Only draft backlog items may be deleted');
      }

      return this.toBacklogItemDto(item);
    }, this.backlogLifecycleTransactionOptions);
  }

  async listMy(
    query: GetProgramBBacklogQueryDto,
    user: AuthenticatedUserContext,
  ): Promise<GetProgramBBacklogResponseDto> {
    const organization = await this.ensureActiveOrganizationMember(user);
    const where = this.buildListWhere(organization.id, query);
    const pagination = resolvePagination(query);

    const [items, total] = await Promise.all([
      this.backlogRepository.findDetails({
        where,
        orderBy: this.buildListOrderBy(query),
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.backlogRepository.count(where),
    ]);

    return {
      data: items.map((item) => this.toBacklogItemDto(item)),
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async listPublished(
    query: GetProgramBBacklogQueryDto,
    user: AuthenticatedUserContext,
  ): Promise<GetProgramBBacklogResponseDto> {
    this.ensureActiveStudent(user);

    const pagination = resolvePagination(query);
    const normalizedQuery = query.q?.trim();
    const where: Prisma.BacklogItemWhereInput = {
      status: BacklogItemStatus.PUBLISHED,
      ...(normalizedQuery
        ? {
            OR: [
              {
                title: {
                  contains: normalizedQuery,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: normalizedQuery,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.backlogRepository.findDetails({
        where,
        orderBy: this.buildListOrderBy(query),
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.backlogRepository.count(where),
    ]);

    return {
      data: items.map((item) => this.toBacklogItemDto(item)),
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async findOne(id: string): Promise<ProgramBBacklogDetailView | null> {
    return this.backlogRepository.findDetailUnique({ id });
  }

  async findPublishedById(
    id: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    this.ensureActiveStudent(user);
    const item = await this.backlogRepository.findDetailUnique({ id });

    if (!item || item.status !== BacklogItemStatus.PUBLISHED) {
      throw new NotFoundException('Backlog item not found');
    }

    return this.toBacklogItemDto(item);
  }

  async assignProductOwner(
    id: string,
    dto: AssignProductOwnerDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;

    let item: ProgramBBacklogDetailView;

    if (isAdmin) {
      const found = await this.backlogRepository.findDetailUnique({ id });
      if (!found) {
        throw new NotFoundException('Backlog item not found');
      }
      item = found;
    } else {
      const organization = await this.ensureActiveOrganizationMember(user);
      item = await this.getItemForOrganizationOrThrow(id, organization.id);
    }

    if (item.status === BacklogItemStatus.ARCHIVED) {
      throw new ConflictException(
        'Product Owner cannot be assigned to an archived backlog item',
      );
    }

    return this.backlogRepository.transaction(async (db) => {
      await this.ensureAssignableProductOwner(
        item.organizationId,
        dto.productOwnerUserId,
        db,
      );

      const result = await this.backlogRepository.updateMany(
        {
          id: item.id,
          status: {
            in: [
              BacklogItemStatus.DRAFT,
              BacklogItemStatus.PUBLISHED,
              BacklogItemStatus.IN_PAIRING,
            ],
          },
        },
        { productOwnerUserId: dto.productOwnerUserId },
        db,
      );

      const updatedItem = await this.backlogRepository.findDetailUnique(
        { id: item.id },
        db,
      );

      if (!updatedItem) {
        throw new NotFoundException('Backlog item not found');
      }

      if (result.count === 0) {
        throw new ConflictException(
          'Product Owner cannot be assigned in the current backlog state',
        );
      }

      return this.toBacklogItemDto(updatedItem);
    }, this.backlogLifecycleTransactionOptions);
  }

  async listCandidates(backlogItemId: string, user: AuthenticatedUserContext) {
    const organization = await this.ensureActiveOrganizationMember(user);
    await this.getItemForOrganizationOrThrow(backlogItemId, organization.id);

    return this.teamApplicationRepository.findCandidatesForBacklog(
      backlogItemId,
    );
  }

  async publish(
    id: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    const organization = await this.ensureActiveOrganizationMember(user);

    return this.backlogRepository.transaction(async (db) => {
      const item = await this.getItemForOrganizationOrThrow(
        id,
        organization.id,
        db,
      );

      if (item.status !== BacklogItemStatus.DRAFT) {
        throw new ConflictException(
          'Only draft backlog items may be published',
        );
      }

      this.ensurePublishReadiness(item);
      await this.ensureProductOwnerFromSameOrganization(
        organization.id,
        item.productOwnerUserId,
        true,
        db,
      );

      const result = await this.backlogRepository.updateMany(
        { id: item.id, status: BacklogItemStatus.DRAFT },
        { status: BacklogItemStatus.PUBLISHED },
        db,
      );

      if (result.count === 0) {
        throw new ConflictException(
          'Only draft backlog items may be published',
        );
      }

      const publishedItem = await this.backlogRepository.findDetailUnique(
        { id: item.id },
        db,
      );

      if (!publishedItem) {
        throw new NotFoundException('Backlog item not found');
      }

      return this.toBacklogItemDto(publishedItem);
    }, this.backlogLifecycleTransactionOptions);
  }

  async archive(
    id: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    const organization = await this.ensureActiveOrganizationMember(user);
    const item = await this.getItemForOrganizationOrThrow(id, organization.id);

    if (
      item.status !== BacklogItemStatus.DRAFT &&
      item.status !== BacklogItemStatus.PUBLISHED
    ) {
      throw new ConflictException(
        'Only draft or published backlog items may be archived',
      );
    }

    return this.backlogRepository.transaction(async (db) => {
      const result = await this.backlogRepository.updateMany(
        {
          id: item.id,
          status: {
            in: [BacklogItemStatus.DRAFT, BacklogItemStatus.PUBLISHED],
          },
        },
        { status: BacklogItemStatus.ARCHIVED },
        db,
      );

      if (result.count === 0) {
        throw new ConflictException(
          'Only draft or published backlog items may be archived',
        );
      }

      const archivedItem = await this.backlogRepository.findDetailUnique(
        { id: item.id },
        db,
      );

      if (!archivedItem) {
        throw new NotFoundException('Backlog item not found');
      }

      return this.toBacklogItemDto(archivedItem);
    }, this.backlogLifecycleTransactionOptions);
  }

  async shortlistCandidate(
    backlogItemId: string,
    applicationId: string,
    dto: ProgramBCandidateDecisionDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBTeamApplication> {
    const organization = await this.ensureActiveOrganizationMember(user);

    return this.backlogRepository.transaction(async (db) => {
      const backlogItem = await this.getItemForOrganizationOrThrow(
        backlogItemId,
        organization.id,
        db,
      );
      this.ensureCandidateDecisionsAllowed(backlogItem);

      const candidate = await this.getCandidateForBacklogOrThrow(
        backlogItem.id,
        applicationId,
        db,
      );

      if (candidate.status === ProgramBTeamApplicationStatus.SHORTLISTED) {
        return candidate;
      }

      if (candidate.status !== ProgramBTeamApplicationStatus.SUBMITTED) {
        throw new ConflictException(
          'Only submitted candidates may be shortlisted',
        );
      }

      const result = await this.teamApplicationRepository.updateMany(
        {
          id: candidate.id,
          backlogItemId: backlogItem.id,
          status: ProgramBTeamApplicationStatus.SUBMITTED,
        },
        {
          status: ProgramBTeamApplicationStatus.SHORTLISTED,
          shortlistedAt: new Date(),
          decisionReason: dto.reason ?? null,
        },
        db,
      );

      if (result.count === 0) {
        throw new ConflictException(
          'Only submitted candidates may be shortlisted',
        );
      }

      if (backlogItem.status === BacklogItemStatus.PUBLISHED) {
        await this.backlogRepository.update(
          { id: backlogItem.id },
          { status: BacklogItemStatus.IN_PAIRING },
          db,
        );
      }

      return this.getCandidateForBacklogOrThrow(
        backlogItem.id,
        candidate.id,
        db,
      );
    }, this.backlogLifecycleTransactionOptions);
  }

  async acceptCandidate(
    backlogItemId: string,
    applicationId: string,
    dto: ProgramBCandidateDecisionDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBTeamApplication> {
    const organization = await this.ensureActiveOrganizationMember(user);

    try {
      return await this.backlogRepository.transaction(async (db) => {
        const backlogItem = await this.getItemForOrganizationOrThrow(
          backlogItemId,
          organization.id,
          db,
        );
        this.ensureCandidateDecisionsAllowed(backlogItem);

        const candidate = await this.getCandidateForBacklogOrThrow(
          backlogItem.id,
          applicationId,
          db,
        );

        if (
          candidate.status === ProgramBTeamApplicationStatus.ACCEPTED ||
          candidate.status === ProgramBTeamApplicationStatus.PROJECT_CREATED
        ) {
          return candidate;
        }

        if (
          candidate.status !== ProgramBTeamApplicationStatus.SUBMITTED &&
          candidate.status !== ProgramBTeamApplicationStatus.SHORTLISTED
        ) {
          throw new ConflictException(
            'Only submitted or shortlisted candidates may be accepted',
          );
        }

        const acceptedAt = new Date();
        const result = await this.teamApplicationRepository.updateMany(
          {
            id: candidate.id,
            backlogItemId: backlogItem.id,
            status: {
              in: [
                ProgramBTeamApplicationStatus.SUBMITTED,
                ProgramBTeamApplicationStatus.SHORTLISTED,
              ],
            },
          },
          {
            status: ProgramBTeamApplicationStatus.ACCEPTED,
            acceptedAt,
            decisionReason: dto.reason ?? null,
          },
          db,
        );

        if (result.count === 0) {
          throw new ConflictException(
            'Only submitted or shortlisted candidates may be accepted',
          );
        }

        await this.teamApplicationRepository.updateMany(
          {
            backlogItemId: backlogItem.id,
            id: { not: candidate.id },
            status: {
              in: [
                ProgramBTeamApplicationStatus.SUBMITTED,
                ProgramBTeamApplicationStatus.SHORTLISTED,
              ],
            },
          },
          {
            status: ProgramBTeamApplicationStatus.REJECTED,
            rejectedAt: acceptedAt,
            decisionReason:
              'Automatically rejected because another candidate was accepted.',
          },
          db,
        );

        if (backlogItem.status === BacklogItemStatus.PUBLISHED) {
          await this.backlogRepository.update(
            { id: backlogItem.id },
            { status: BacklogItemStatus.IN_PAIRING },
            db,
          );
        }

        return this.getCandidateForBacklogOrThrow(
          backlogItem.id,
          candidate.id,
          db,
        );
      }, this.backlogLifecycleTransactionOptions);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          'A candidate has already been accepted for this backlog item',
        );
      }

      throw error;
    }
  }

  async rejectCandidate(
    backlogItemId: string,
    applicationId: string,
    dto: ProgramBCandidateDecisionDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBTeamApplication> {
    const organization = await this.ensureActiveOrganizationMember(user);

    return this.backlogRepository.transaction(async (db) => {
      const backlogItem = await this.getItemForOrganizationOrThrow(
        backlogItemId,
        organization.id,
        db,
      );
      this.ensureCandidateDecisionsAllowed(backlogItem);

      const candidate = await this.getCandidateForBacklogOrThrow(
        backlogItem.id,
        applicationId,
        db,
      );

      if (candidate.status === ProgramBTeamApplicationStatus.REJECTED) {
        return candidate;
      }

      if (
        candidate.status !== ProgramBTeamApplicationStatus.SUBMITTED &&
        candidate.status !== ProgramBTeamApplicationStatus.SHORTLISTED
      ) {
        throw new ConflictException(
          'Only submitted or shortlisted candidates may be rejected',
        );
      }

      const result = await this.teamApplicationRepository.updateMany(
        {
          id: candidate.id,
          backlogItemId: backlogItem.id,
          status: {
            in: [
              ProgramBTeamApplicationStatus.SUBMITTED,
              ProgramBTeamApplicationStatus.SHORTLISTED,
            ],
          },
        },
        {
          status: ProgramBTeamApplicationStatus.REJECTED,
          rejectedAt: new Date(),
          decisionReason: dto.reason ?? null,
        },
        db,
      );

      if (result.count === 0) {
        throw new ConflictException(
          'Only submitted or shortlisted candidates may be rejected',
        );
      }

      return this.getCandidateForBacklogOrThrow(
        backlogItem.id,
        candidate.id,
        db,
      );
    }, this.backlogLifecycleTransactionOptions);
  }

  async createProjectFromCandidate(
    backlogItemId: string,
    applicationId: string,
    user: AuthenticatedUserContext,
  ) {
    const organization = await this.ensureActiveOrganizationMember(user);

    try {
      return await this.backlogRepository.transaction(async (db) => {
        const backlogItem = await this.getItemForOrganizationOrThrow(
          backlogItemId,
          organization.id,
          db,
        );

        if (backlogItem.status === BacklogItemStatus.ARCHIVED) {
          throw new ConflictException(
            'Archived backlog items cannot create Program B projects',
          );
        }

        const candidate = await this.getCandidateForBacklogOrThrow(
          backlogItem.id,
          applicationId,
          db,
        );

        const existingProject =
          await this.projectsRepository.findProjectByTeamApplicationId(
            candidate.id,
            db,
          );

        if (existingProject) {
          if (
            candidate.status !== ProgramBTeamApplicationStatus.PROJECT_CREATED
          ) {
            await this.teamApplicationRepository.update(
              { id: candidate.id },
              { status: ProgramBTeamApplicationStatus.PROJECT_CREATED },
              db,
            );
          }

          return existingProject;
        }

        if (candidate.status !== ProgramBTeamApplicationStatus.ACCEPTED) {
          throw new ConflictException(
            'Only accepted candidates may be handed off into a project',
          );
        }

        if (!backlogItem.productOwnerUserId) {
          throw new ConflictException(
            'Backlog item must have an active product owner before project handoff',
          );
        }

        await this.ensureProductOwnerFromSameOrganization(
          organization.id,
          backlogItem.productOwnerUserId,
          true,
          db,
        );

        const project = await this.projectsRepository.createProject(
          {
            backlogItemId: backlogItem.id,
            teamApplicationId: candidate.id,
            teamId: candidate.teamId,
            productOwnerUserId: backlogItem.productOwnerUserId,
            mentorUserId: null,
            mentorAssignedAt: null,
            mentorAssignedById: null,
          },
          db,
        );

        await this.teamApplicationRepository.update(
          { id: candidate.id },
          { status: ProgramBTeamApplicationStatus.PROJECT_CREATED },
          db,
        );

        await this.backlogRepository.update(
          { id: backlogItem.id },
          { status: BacklogItemStatus.ASSIGNED },
          db,
        );

        return project;
      }, this.backlogLifecycleTransactionOptions);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        const existingProject =
          await this.projectsRepository.findProjectByTeamApplicationId(
            applicationId,
          );

        if (existingProject) {
          return existingProject;
        }

        throw new ConflictException(
          'A Program B project already exists for this candidate',
        );
      }

      throw error;
    }
  }

  async createBacklogDocumentUpload(
    backlogItemId: string,
    dto: CreateProgramBBacklogDocumentUploadDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogDocumentUploadDto> {
    const organization = await this.ensureActiveOrganizationMember(user);
    const item = await this.getItemForOrganizationOrThrow(
      backlogItemId,
      organization.id,
    );

    if (item.status === BacklogItemStatus.ARCHIVED) {
      throw new ConflictException('Archived backlog items are read-only');
    }

    const upload = await this.filesService.requestUpload(user, {
      filename: dto.filename,
      mimeType: dto.mimeType,
      size: dto.size,
      visibility: FileVisibility.PRIVATE,
      purpose: 'program-b-backlog-document',
      entityType: 'ProgramBBacklogDocument',
      entityId: backlogItemId,
    });

    const currentDocuments =
      await this.backlogRepository.listBacklogDocuments(backlogItemId);
    const version =
      Math.max(
        0,
        ...currentDocuments
          .filter((document) => document.category === dto.category)
          .map((document) => document.version),
      ) + 1;

    const document = await this.backlogRepository.createBacklogDocument({
      backlogItemId,
      uploadedFileId: upload.fileId,
      category: dto.category,
      visibility: dto.visibility,
      version,
      createdById: user.id,
    });

    return {
      documentId: document.id,
      fileId: upload.fileId,
      uploadUrl: upload.uploadUrl,
      expiresAt: upload.expiresAt,
    };
  }

  async completeBacklogDocumentUpload(
    backlogItemId: string,
    documentId: string,
    dto: CompleteProgramBDocumentUploadDto,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogDocumentDto> {
    const organization = await this.ensureActiveOrganizationMember(user);
    await this.getItemForOrganizationOrThrow(backlogItemId, organization.id);

    const document = await this.getBacklogDocumentOrThrow(
      backlogItemId,
      documentId,
    );

    await this.filesService.completeUpload(user, {
      fileId: document.uploadedFile.id,
      size: dto.size,
      checksum: dto.checksum,
    });

    const completedDocument = await this.getBacklogDocumentOrThrow(
      backlogItemId,
      documentId,
    );

    return this.toBacklogDocumentDto(completedDocument);
  }

  async listBacklogDocuments(
    backlogItemId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogDocumentDto[]> {
    const item = await this.ensureBacklogReadAccess(backlogItemId, user);
    const documents =
      await this.backlogRepository.listBacklogDocuments(backlogItemId);

    return documents
      .filter((document) => this.canReadBacklogDocument(item, document, user))
      .map((document) => this.toBacklogDocumentDto(document));
  }

  async requestBacklogDocumentDownload(
    backlogItemId: string,
    documentId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBDocumentDownloadDto> {
    const item = await this.ensureBacklogReadAccess(backlogItemId, user);
    const document = await this.getBacklogDocumentOrThrow(
      backlogItemId,
      documentId,
    );

    if (!this.canReadBacklogDocument(item, document, user)) {
      throw new ForbiddenException();
    }

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

  assertProductOwnerOrAdmin(
    actor: AuthenticatedUserContext,
    item: ProgramBBacklogDetailView,
  ): void {
    if (actor.role === UserRole.ADMIN || actor.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (actor.id === item.productOwnerUserId) {
      return;
    }

    throw new ForbiddenException();
  }

  private ensureActiveStudent(user: AuthenticatedUserContext): void {
    if (user.role !== UserRole.STUDENT || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Only active student users may browse published backlog items',
      );
    }
  }

  private async ensureActiveOrganizationMember(user: AuthenticatedUserContext) {
    if (!user.organizationId || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Only active organization members may manage backlog items',
      );
    }

    const organization = await this.organizationRepository.findUnique({
      id: user.organizationId,
    });

    if (!organization || organization.status !== OrganizationStatus.ACTIVE) {
      throw new ForbiddenException(
        'Only active organization members may manage backlog items',
      );
    }

    return organization;
  }

  private async ensureBacklogReadAccess(
    backlogItemId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogDetailView> {
    const item = await this.backlogRepository.findDetailUnique({
      id: backlogItemId,
    });

    if (!item) {
      throw new NotFoundException('Backlog item not found');
    }

    if (
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.EVALUATOR
    ) {
      return item;
    }

    if (
      (user.role === UserRole.COMPANY_OWNER ||
        user.role === UserRole.COMPANY_EMPLOYEE) &&
      user.organizationId === item.organizationId &&
      user.status === UserStatus.ACTIVE
    ) {
      return item;
    }

    if (user.role === UserRole.STUDENT && user.status === UserStatus.ACTIVE) {
      if (item.status !== BacklogItemStatus.PUBLISHED) {
        throw new NotFoundException('Backlog item not found');
      }

      return item;
    }

    throw new ForbiddenException();
  }

  private async getItemForOrganizationOrThrow(
    itemId: string,
    organizationId: string,
    db?: PrismaDbClient,
  ): Promise<ProgramBBacklogDetailView> {
    const item = await this.backlogRepository.findDetailUnique(
      { id: itemId },
      db,
    );

    if (!item) {
      throw new NotFoundException('Backlog item not found');
    }

    if (item.organizationId !== organizationId) {
      throw new ForbiddenException();
    }

    return item;
  }

  private async getBacklogDocumentOrThrow(
    backlogItemId: string,
    documentId: string,
    db?: PrismaDbClient,
  ) {
    const document = await this.backlogRepository.findBacklogDocumentById(
      documentId,
      db,
    );

    if (!document || document.backlogItemId !== backlogItemId) {
      throw new NotFoundException('Program B backlog document not found');
    }

    return document;
  }

  private canReadBacklogDocument(
    item: ProgramBBacklogDetailView,
    document: {
      visibility: string;
    },
    user: AuthenticatedUserContext,
  ): boolean {
    if (
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.EVALUATOR
    ) {
      return true;
    }

    if (
      user.role === UserRole.COMPANY_OWNER ||
      user.role === UserRole.COMPANY_EMPLOYEE
    ) {
      return user.organizationId === item.organizationId;
    }

    if (user.role === UserRole.STUDENT) {
      return (
        item.status === BacklogItemStatus.PUBLISHED &&
        document.visibility === 'PARTICIPANTS'
      );
    }

    return false;
  }

  private async getCandidateForBacklogOrThrow(
    backlogItemId: string,
    applicationId: string,
    db?: PrismaDbClient,
  ): Promise<ProgramBTeamApplication> {
    const candidate = await this.teamApplicationRepository.findUniqueWithCv(
      { id: applicationId },
      db,
    );

    if (!candidate || candidate.backlogItemId !== backlogItemId) {
      throw new NotFoundException('Program B candidate application not found');
    }

    return candidate as ProgramBTeamApplication;
  }

  private ensureCandidateDecisionsAllowed(
    backlogItem: ProgramBBacklogDetailView,
  ): void {
    if (backlogItem.status === BacklogItemStatus.ARCHIVED) {
      throw new ConflictException(
        'Archived backlog items do not accept candidate decisions',
      );
    }

    if (
      backlogItem.status !== BacklogItemStatus.PUBLISHED &&
      backlogItem.status !== BacklogItemStatus.IN_PAIRING
    ) {
      throw new ConflictException(
        'Only published or pairing backlog items accept candidate decisions',
      );
    }
  }

  private async ensureProductOwnerFromSameOrganization(
    organizationId: string,
    productOwnerUserId?: string | null,
    required = false,
    db?: PrismaDbClient,
  ): Promise<void> {
    if (!productOwnerUserId) {
      if (required) {
        throw new BadRequestException(
          'Product owner must be a member of the same organization',
        );
      }

      return;
    }

    const productOwner = await this.userRepository.findActiveOrganizationMember(
      organizationId,
      productOwnerUserId,
      db,
    );

    if (!productOwner) {
      throw new BadRequestException(
        'Product owner must be a member of the same organization',
      );
    }
  }

  private async ensureAssignableProductOwner(
    organizationId: string,
    productOwnerUserId: string,
    db?: PrismaDbClient,
  ): Promise<void> {
    const user = await this.userRepository.findUnique(
      { id: productOwnerUserId },
      db,
    );

    if (!user) {
      throw new NotFoundException('Target user not found');
    }

    const member = await this.userRepository.findActiveOrganizationMember(
      organizationId,
      productOwnerUserId,
      db,
    );

    if (!member) {
      throw new ForbiddenException(
        'Target user must be an active member of the same organization',
      );
    }
  }

  private ensurePublishReadiness(item: ProgramBBacklogDetailView): void {
    if (!item.title?.trim()) {
      throw new BadRequestException('Title is required for publish');
    }

    if (!item.description?.trim()) {
      throw new BadRequestException('Description is required for publish');
    }

    if (item.budget === null || item.budget === undefined || item.budget <= 0) {
      throw new BadRequestException(
        'Budget must be greater than 0 for publish',
      );
    }

    if (!item.productOwnerUserId) {
      throw new BadRequestException(
        'Product owner must be a member of the same organization',
      );
    }
  }

  private buildListWhere(
    organizationId: string,
    query: GetProgramBBacklogQueryDto,
  ): Prisma.BacklogItemWhereInput {
    const and: Prisma.BacklogItemWhereInput[] = [{ organizationId }];
    const normalizedQuery = query.q?.trim();

    if (query.status) {
      and.push({ status: query.status });
    }

    if (normalizedQuery) {
      and.push({
        OR: [
          {
            title: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    return and.length === 1 ? and[0] : { AND: and };
  }

  private buildListOrderBy(
    query: GetProgramBBacklogQueryDto,
  ): Prisma.BacklogItemOrderByWithRelationInput[] {
    return buildOrderBy(query.sort, query.order, [{ id: 'asc' }]);
  }

  private toBacklogDocumentDto(document: {
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
  }): ProgramBBacklogDocumentDto {
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

  private toBacklogItemDto(
    item: ProgramBBacklogDetailView,
  ): ProgramBBacklogItemDto {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      budget: item.budget,
      expectedOutcomes: item.expectedOutcomes,
      productOwnerUserId: item.productOwnerUserId,
      organizationId: item.organizationId,
      organization: item.organization,
      status: item.status,
      productOwner: item.productOwner ?? null,
      documents: item.documents.map((document) =>
        this.toBacklogDocumentDto(document),
      ),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

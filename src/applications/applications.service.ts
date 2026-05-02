import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationDocumentScope,
  ApplicationStatus,
  DocumentType,
  ProgramType,
  UploadStatus,
  UserRole,
} from '../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { FilesRepository } from '../files/files.repository';
import { TeamRepository } from '../team/team.repository';
import { ApplicationDocumentsRepository } from './application-documents.repository';
import { ApplicationRulesService } from './application-rules.service';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationDocumentDto } from './dto/application-document.dto';
import { AttachApplicationDocumentDto } from './dto/attach-application-document.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { DocumentCompletenessDto } from './dto/document-completeness.dto';
import { RequiredDocumentsResponseDto } from './dto/required-documents-response.dto';
import {
  ApplicationWithRelations,
  ApplicationsRepository,
  ApplicationWorkflowView,
} from './applications.repository';
import { CallsRepository } from './calls.repository';

type RequiredDocumentSlot = {
  documentType: DocumentType;
  documentScope: ApplicationDocumentScope;
  memberUserId: string | null;
};

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly applicationDocumentsRepository: ApplicationDocumentsRepository,
    private readonly applicationRulesService: ApplicationRulesService,
    private readonly callsRepository: CallsRepository,
    private readonly teamRepository: TeamRepository,
    private readonly filesRepository: FilesRepository,
  ) {}

  async createDraft(
    user: AuthenticatedUserContext,
    dto: CreateApplicationDto,
  ): Promise<ApplicationDetailDto> {
    let created: ApplicationWithRelations;

    try {
      created = await this.applicationsRepository.transaction(async (db) => {
        await this.applicationRulesService.validateApplicationCreationRules(
          dto.callId,
          dto.teamId,
          user.id,
          db,
        );

        const existing =
          await this.applicationsRepository.findActiveByTeamAndCall(
            dto.teamId,
            dto.callId,
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

  async getRequiredDocumentsForCall(
    callId: string,
  ): Promise<RequiredDocumentsResponseDto> {
    const call =
      await this.callsRepository.findByIdWithRequiredDocumentTypes(callId);

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return {
      callId: call.id,
      programType: call.type,
      requiredDocuments:
        call.type === ProgramType.PROGRAM_A
          ? call.requiredDocumentTypes.map((document) => ({
              id: document.id,
              documentType: document.documentType,
              isRequired: document.isRequired,
            }))
          : [],
    };
  }

  async attachDocument(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: AttachApplicationDocumentDto,
  ): Promise<ApplicationDocumentDto> {
    const document = await this.applicationsRepository.transaction(
      async (db) => {
        const application = await this.loadWorkflowApplicationOrThrow(
          applicationId,
          db,
        );

        this.ensureProgramADocumentWorkflow(application);
        this.ensureApplicationManagedByTeamLead(application, user.id);
        this.ensureApplicationIsDraft(application);

        const slot = this.resolveAttachmentSlot(application, dto);
        const uploadedFile = await this.filesRepository.findByIdForOwners(
          dto.fileId,
          slot.allowedOwnerIds,
          db,
        );

        if (!uploadedFile) {
          throw new BadRequestException(
            'File does not exist or cannot be attached to this application',
          );
        }

        if (uploadedFile.status !== UploadStatus.UPLOADED) {
          throw new BadRequestException(
            'File must be uploaded before being attached to application documents',
          );
        }

        await this.applicationDocumentsRepository.deactivateActiveBySlot(
          application.id,
          slot.documentType,
          slot.documentScope,
          slot.memberUserId,
          db,
        );

        const latestVersion =
          await this.applicationDocumentsRepository.findLatestVersionNumberBySlot(
            application.id,
            slot.documentType,
            slot.documentScope,
            slot.memberUserId,
            db,
          );

        return this.applicationDocumentsRepository.createVersioned(
          {
            applicationId: application.id,
            uploadedFileId: uploadedFile.id,
            documentType: slot.documentType,
            documentScope: slot.documentScope,
            memberUserId: slot.memberUserId,
            version: (latestVersion?.version ?? 0) + 1,
            isActive: true,
            createdById: user.id,
          },
          db,
        );
      },
    );

    return this.toApplicationDocumentDto(document);
  }

  async getDocumentCompleteness(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<DocumentCompletenessDto> {
    const application =
      await this.loadWorkflowApplicationOrThrow(applicationId);

    this.validateApplicationAccess(application, user);

    return this.buildDocumentCompleteness(application);
  }

  async submit(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    const submitted = await this.applicationsRepository.transaction(
      async (db) => {
        const application = await this.loadWorkflowApplicationOrThrow(
          applicationId,
          db,
        );

        this.ensureApplicationManagedByTeamLead(application, user.id);
        this.ensureApplicationIsDraft(application);
        this.ensureApplicationCanBeSubmitted(application);

        if (application.call.type === ProgramType.PROGRAM_A) {
          const completeness = this.buildDocumentCompleteness(application);

          if (!completeness.isComplete) {
            throw new ConflictException(
              'Application is missing required documents',
            );
          }
        }

        const now = new Date();
        await this.applicationsRepository.submitDraft(application.id, now, db);

        if (application.team.lockedAt === null) {
          await this.teamRepository.update(
            { id: application.team.id },
            { lockedAt: now },
            db,
          );
        }

        const refreshed =
          await this.applicationsRepository.findByIdWithRelations(
            application.id,
            db,
          );

        if (!refreshed) {
          throw new NotFoundException('Application not found');
        }

        return refreshed;
      },
    );

    return this.toDetailDto(submitted);
  }

  private async loadWorkflowApplicationOrThrow(
    applicationId: string,
    db?: Parameters<ApplicationsRepository['findByIdForWorkflow']>[1],
  ): Promise<ApplicationWorkflowView> {
    const application = await this.applicationsRepository.findByIdForWorkflow(
      applicationId,
      db,
    );

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  private ensureProgramADocumentWorkflow(application: ApplicationWorkflowView) {
    if (application.call.type !== ProgramType.PROGRAM_A) {
      throw new ConflictException(
        'Application document pack is supported only for Program A applications',
      );
    }
  }

  private ensureApplicationManagedByTeamLead(
    application: ApplicationWorkflowView,
    userId: string,
  ): void {
    if (application.team.leaderId !== userId) {
      throw new ForbiddenException(
        'Only team lead can manage application documents and submission',
      );
    }
  }

  private ensureApplicationIsDraft(application: ApplicationWorkflowView): void {
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new ConflictException(
        `Only draft applications can be submitted (status: ${application.status})`,
      );
    }
  }

  private ensureApplicationCanBeSubmitted(
    application: ApplicationWorkflowView,
  ): void {
    if (application.team.archivedAt !== null) {
      throw new ConflictException(
        'Team is archived and cannot submit applications',
      );
    }

    this.applicationRulesService.ensureCallOpenForApplications(
      application.call,
    );
  }

  private resolveAttachmentSlot(
    application: ApplicationWorkflowView,
    dto: AttachApplicationDocumentDto,
  ): RequiredDocumentSlot & { allowedOwnerIds: string[] } {
    if (dto.documentType === DocumentType.CV) {
      if (!dto.memberUserId) {
        throw new BadRequestException(
          'memberUserId is required for CV attachments',
        );
      }

      const isTeamMember = application.team.members.some(
        (member) => member.userId === dto.memberUserId,
      );

      if (!isTeamMember) {
        throw new BadRequestException(
          'CV can only be attached for a current team member',
        );
      }

      return {
        documentType: dto.documentType,
        documentScope: ApplicationDocumentScope.TEAM_MEMBER,
        memberUserId: dto.memberUserId,
        allowedOwnerIds: [
          ...new Set([application.team.leaderId, dto.memberUserId]),
        ],
      };
    }

    if (dto.memberUserId) {
      throw new BadRequestException(
        'memberUserId is only allowed for CV attachments',
      );
    }

    return {
      documentType: dto.documentType,
      documentScope: ApplicationDocumentScope.APPLICATION,
      memberUserId: null,
      allowedOwnerIds: [application.team.leaderId],
    };
  }

  private buildDocumentCompleteness(
    application: ApplicationWorkflowView,
  ): DocumentCompletenessDto {
    if (application.call.type !== ProgramType.PROGRAM_A) {
      return {
        applicationId: application.id,
        isComplete: true,
        satisfiedDocuments: [],
        missingDocuments: [],
      };
    }

    const requiredSlots = this.buildRequiredDocumentSlots(application);
    const activeDocumentKeys = new Set(
      application.documents.map((document) =>
        this.buildDocumentSlotKey(
          document.documentType,
          document.documentScope,
          document.memberUserId,
        ),
      ),
    );

    const satisfiedDocuments = requiredSlots.filter((slot) =>
      activeDocumentKeys.has(
        this.buildDocumentSlotKey(
          slot.documentType,
          slot.documentScope,
          slot.memberUserId,
        ),
      ),
    );

    const missingDocuments = requiredSlots.filter(
      (slot) =>
        !activeDocumentKeys.has(
          this.buildDocumentSlotKey(
            slot.documentType,
            slot.documentScope,
            slot.memberUserId,
          ),
        ),
    );

    return {
      applicationId: application.id,
      isComplete: missingDocuments.length === 0,
      satisfiedDocuments,
      missingDocuments,
    };
  }

  private buildRequiredDocumentSlots(
    application: ApplicationWorkflowView,
  ): RequiredDocumentSlot[] {
    const slots: RequiredDocumentSlot[] = [];

    for (const requiredDocument of application.call.requiredDocumentTypes) {
      if (requiredDocument.documentType === DocumentType.CV) {
        for (const member of application.team.members) {
          slots.push({
            documentType: DocumentType.CV,
            documentScope: ApplicationDocumentScope.TEAM_MEMBER,
            memberUserId: member.userId,
          });
        }

        continue;
      }

      slots.push({
        documentType: requiredDocument.documentType,
        documentScope: ApplicationDocumentScope.APPLICATION,
        memberUserId: null,
      });
    }

    return slots;
  }

  private buildDocumentSlotKey(
    documentType: DocumentType,
    documentScope: ApplicationDocumentScope,
    memberUserId: string | null,
  ): string {
    return `${documentType}:${documentScope}:${memberUserId ?? 'application'}`;
  }

  private validateApplicationAccess(
    application: ApplicationWithRelations | ApplicationWorkflowView,
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

  private toApplicationDocumentDto(
    document: Awaited<
      ReturnType<ApplicationDocumentsRepository['createVersioned']>
    >,
  ): ApplicationDocumentDto {
    return {
      id: document.id,
      applicationId: document.applicationId,
      documentType: document.documentType,
      documentScope: document.documentScope,
      memberUserId: document.memberUserId,
      uploadedFileId: document.uploadedFileId,
      version: document.version,
      isActive: document.isActive,
      originalName: document.uploadedFile.originalName,
      mimeType: document.uploadedFile.mimeType,
      size: document.uploadedFile.size,
      visibility: document.uploadedFile.visibility,
      uploadStatus: document.uploadedFile.status,
      uploadedFileOwnerId: document.uploadedFile.ownerId,
      createdAt: document.createdAt,
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

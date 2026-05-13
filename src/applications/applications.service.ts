import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { Call } from '../../generated/prisma/client';
import {
  ApplicationDocumentScope,
  ApplicationStatus,
  DocumentType,
  NeedsInfoItemStatus,
  ProgramType,
  UploadStatus,
  UserRole,
} from '../../generated/prisma/enums';
import { ensureAdminRole, isAdminRole } from '../auth/admin-role.helper';
import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
} from '../common/pagination';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { FilesRepository } from '../files/files.repository';
import { TeamRepository } from '../team/team.repository';
import { UserRepository } from '../user/user.repository';
import { ApplicationDocumentsRepository } from './application-documents.repository';
import { ApplicationRulesService } from './rules/application-rules.service';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationDocumentDto } from './dto/application-document.dto';
import { ApplicationStatusEventDto } from './dto/application-status-event.dto';
import { AssignMentorDto } from './dto/assign-mentor.dto';
import { AttachApplicationDocumentDto } from './dto/attach-application-document.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CreateMentorshipNoteDto } from './dto/create-mentorship-note.dto';
import { CreateNeedsInfoItemDto } from './dto/create-needs-info-item.dto';
import { CreateNeedsInfoReplyDto } from './dto/create-needs-info-reply.dto';
import { DocumentCompletenessDto } from './dto/document-completeness.dto';
import { MentorAssignmentDto } from './dto/mentor-assignment.dto';
import { MentorshipNoteAuthorDto } from './dto/mentorship-note-author.dto';
import { NeedsInfoItemDto } from './dto/needs-info-item.dto';
import { NeedsInfoReplyDto } from './dto/needs-info-reply.dto';
import { NeedsInfoThreadDto } from './dto/needs-info-thread.dto';
import { PublicCallDto } from './dto/public-call.dto';
import { PublicCallsQueryDto } from './dto/public-calls-query.dto';
import { ProgramAMentorshipNoteDto } from './dto/program-a-mentorship-note.dto';
import { PublicCallsResponseDto } from './dto/public-calls-response.dto';
import { RequiredDocumentsResponseDto } from './dto/required-documents-response.dto';
import { ResubmitApplicationDto } from './dto/resubmit-application.dto';
import {
  ApplicationWithRelations,
  ApplicationsRepository,
  ApplicationWorkflowView,
} from './applications.repository';
import { CallsRepository } from './calls.repository';
import { NeedsInfoRepository } from './needs-info.repository';
import {
  ProgramAMentorshipNoteWithAuthor,
  ProgramAMentorshipRepository,
} from './program-a-mentorship.repository';

type RequiredDocumentSlot = {
  documentType: DocumentType;
  documentScope: ApplicationDocumentScope;
  memberUserId: string | null;
};

@Injectable()
export class ApplicationsService {
  private readonly mentorshipAssignableStatuses: readonly ApplicationStatus[] =
    [
      ApplicationStatus.APPROVED,
      ApplicationStatus.ONBOARDING,
      ApplicationStatus.ACTIVE_PROJECT,
      ApplicationStatus.PAUSED,
      ApplicationStatus.COMPLETED,
    ];

  private readonly applicationDocumentAttachTransactionOptions = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  } as const;

  private readonly needsInfoTransactionOptions = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  } as const;

  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly applicationDocumentsRepository: ApplicationDocumentsRepository,
    private readonly applicationRulesService: ApplicationRulesService,
    private readonly callsRepository: CallsRepository,
    private readonly teamRepository: TeamRepository,
    private readonly filesRepository: FilesRepository,
    private readonly needsInfoRepository: NeedsInfoRepository,
    private readonly programAMentorshipRepository: ProgramAMentorshipRepository,
    private readonly userRepository: UserRepository,
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

  async listPublicCalls(
    query: PublicCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    return this.listCalls({
      query,
      activeOnly: false,
    });
  }

  async listActivePublicCalls(
    query: PublicCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    return this.listCalls({
      query,
      activeOnly: true,
    });
  }

  async findPublicCallById(id: string): Promise<PublicCallDto> {
    const call = await this.callsRepository.findPublicById(id);

    if (!call) {
      throw new NotFoundException('Public call not found');
    }

    return this.toPublicCallDto(call);
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
    let document: Awaited<
      ReturnType<ApplicationDocumentsRepository['createVersioned']>
    >;

    try {
      document = await this.applicationsRepository.transaction(async (db) => {
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
      }, this.applicationDocumentAttachTransactionOptions);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Another document was attached to this slot concurrently. Please retry.',
        );
      }

      throw error;
    }

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

  async createNeedsInfoItem(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: CreateNeedsInfoItemDto,
  ): Promise<NeedsInfoItemDto> {
    if (!this.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        'Only reviewer-side users can request additional information',
      );
    }

    return this.applicationsRepository.transaction(async (db) => {
      const application = await this.loadWorkflowApplicationOrThrow(
        applicationId,
        db,
      );

      const allowedStatuses: ApplicationStatus[] = [
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.FORMALLY_VERIFIED,
        ApplicationStatus.EVALUATING,
      ];

      if (!allowedStatuses.includes(application.status)) {
        throw new BadRequestException(
          `Needs-info request is not allowed for application status ${application.status}`,
        );
      }

      const item = await this.needsInfoRepository.createItem(
        {
          applicationId: application.id,
          message: dto.message,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
          createdById: user.id,
        },
        db,
      );

      const updated = await this.applicationsRepository.updateStatusIfCurrent(
        application.id,
        application.status,
        ApplicationStatus.NEEDS_INFO,
        db,
      );

      if (updated.count !== 1) {
        throw new ConflictException(
          'Application status was changed concurrently. Please retry.',
        );
      }

      await this.needsInfoRepository.createStatusEvent(
        {
          applicationId: application.id,
          fromStatus: application.status,
          toStatus: ApplicationStatus.NEEDS_INFO,
          changedById: user.id,
          reason: dto.message,
          needsInfoItemId: item.id,
        },
        db,
      );

      return this.toNeedsInfoItemDto({
        ...item,
        replies: [],
      });
    }, this.needsInfoTransactionOptions);
  }

  async replyToNeedsInfoItem(
    applicationId: string,
    itemId: string,
    user: AuthenticatedUserContext,
    dto: CreateNeedsInfoReplyDto,
  ): Promise<NeedsInfoReplyDto> {
    return this.applicationsRepository.transaction(async (db) => {
      const application = await this.loadWorkflowApplicationOrThrow(
        applicationId,
        db,
      );

      this.ensureApplicationManagedByTeamLeadForNeedsInfo(application, user.id);

      if (application.status !== ApplicationStatus.NEEDS_INFO) {
        throw new BadRequestException(
          'Needs-info replies are allowed only while application is in NEEDS_INFO status',
        );
      }

      const item = await this.needsInfoRepository.findItemForApplication(
        application.id,
        itemId,
        db,
      );

      if (!item) {
        throw new NotFoundException('Needs-info item not found');
      }

      if (item.status === NeedsInfoItemStatus.RESOLVED) {
        throw new ConflictException('Needs-info item is already resolved');
      }

      const reply = await this.needsInfoRepository.createReply(
        {
          needsInfoItemId: item.id,
          message: dto.message,
          createdById: user.id,
        },
        db,
      );

      if (item.status === NeedsInfoItemStatus.OPEN) {
        await this.needsInfoRepository.markItemAnswered(item.id, db);
      }

      return this.toNeedsInfoReplyDto(reply);
    }, this.needsInfoTransactionOptions);
  }

  async resubmit(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: ResubmitApplicationDto,
  ): Promise<ApplicationDetailDto> {
    const updatedApplication = await this.applicationsRepository.transaction(
      async (db) => {
        const application = await this.loadWorkflowApplicationOrThrow(
          applicationId,
          db,
        );

        this.ensureApplicationManagedByTeamLeadForNeedsInfo(
          application,
          user.id,
        );

        if (application.status !== ApplicationStatus.NEEDS_INFO) {
          throw new BadRequestException(
            'Application can be resubmitted only from NEEDS_INFO status',
          );
        }

        const unresolvedItems =
          await this.needsInfoRepository.findUnresolvedItems(
            application.id,
            db,
          );

        if (unresolvedItems.length === 0) {
          throw new BadRequestException(
            'Application has no unresolved needs-info items',
          );
        }

        const hasOpenItems = unresolvedItems.some(
          (item) => item.status === NeedsInfoItemStatus.OPEN,
        );

        if (hasOpenItems) {
          throw new BadRequestException(
            'Application cannot be resubmitted while some needs-info items are still open',
          );
        }

        const now = new Date();

        await this.needsInfoRepository.resolveAnsweredItems(
          application.id,
          user.id,
          now,
          db,
        );

        const updated = await this.applicationsRepository.updateStatusIfCurrent(
          application.id,
          ApplicationStatus.NEEDS_INFO,
          ApplicationStatus.EVALUATING,
          db,
        );

        if (updated.count !== 1) {
          throw new ConflictException(
            'Application status was changed concurrently. Please retry.',
          );
        }

        await this.needsInfoRepository.createStatusEvent(
          {
            applicationId: application.id,
            fromStatus: ApplicationStatus.NEEDS_INFO,
            toStatus: ApplicationStatus.EVALUATING,
            changedById: user.id,
            reason:
              dto.message ?? 'Application resubmitted after needs-info replies',
          },
          db,
        );

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
      this.needsInfoTransactionOptions,
    );

    return this.toDetailDto(updatedApplication);
  }

  async getNeedsInfoThread(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<NeedsInfoThreadDto> {
    const application =
      await this.loadWorkflowApplicationOrThrow(applicationId);

    this.validateNeedsInfoThreadAccess(application, user);

    const [items, statusEvents] = await Promise.all([
      this.needsInfoRepository.getThread(application.id),
      this.needsInfoRepository.getStatusEvents(application.id),
    ]);

    return {
      application: {
        id: application.id,
        status: application.status,
        teamId: application.teamId,
        callId: application.callId,
      },
      items: items.map((item) => this.toNeedsInfoItemDto(item)),
      statusEvents: statusEvents.map((event) =>
        this.toApplicationStatusEventDto(event),
      ),
    };
  }

  async assignMentor(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: AssignMentorDto,
  ): Promise<MentorAssignmentDto> {
    ensureAdminRole(user.role, 'Only administrators can assign mentors');

    return this.applicationsRepository.transaction(async (db) => {
      const application = await this.loadWorkflowApplicationOrThrow(
        applicationId,
        db,
      );

      this.ensureProgramAMentorshipWorkflow(application);

      if (!this.mentorshipAssignableStatuses.includes(application.status)) {
        throw new BadRequestException(
          `Mentor assignment is not allowed for application status ${application.status}`,
        );
      }

      const mentor = await this.userRepository.findUnique(
        { id: dto.mentorUserId },
        db,
      );

      if (!mentor) {
        throw new NotFoundException('Mentor user not found');
      }

      if (mentor.role !== UserRole.MENTOR) {
        throw new BadRequestException('Target user must have mentor role');
      }

      const assignedAt = new Date();
      const assignment = await this.applicationsRepository.assignMentor(
        application.id,
        mentor.id,
        assignedAt,
        user.id,
        db,
      );

      return {
        applicationId: assignment.id,
        mentorUserId: assignment.mentorUserId ?? mentor.id,
        assignedAt: assignment.mentorAssignedAt ?? assignedAt,
        assignedById: assignment.mentorAssignedById ?? user.id,
      };
    });
  }

  async createMentorshipNote(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: CreateMentorshipNoteDto,
  ): Promise<ProgramAMentorshipNoteDto> {
    return this.applicationsRepository.transaction(async (db) => {
      const application = await this.loadWorkflowApplicationOrThrow(
        applicationId,
        db,
      );

      this.ensureProgramAMentorshipWorkflow(application);
      this.ensureMentorAssigned(application);
      this.ensureMentorshipAccess(application, user);

      const note = await this.programAMentorshipRepository.createNote(
        {
          applicationId: application.id,
          authorId: user.id,
          content: dto.content,
        },
        db,
      );

      return this.toProgramAMentorshipNoteDto(note);
    });
  }

  async listMentorshipNotes(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramAMentorshipNoteDto[]> {
    const application =
      await this.loadWorkflowApplicationOrThrow(applicationId);

    this.ensureProgramAMentorshipWorkflow(application);
    this.ensureMentorAssigned(application);
    this.ensureMentorshipAccess(application, user);

    const notes = await this.programAMentorshipRepository.listNotes(
      application.id,
    );

    return notes.map((note) => this.toProgramAMentorshipNoteDto(note));
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

  private isReviewerSideUser(user: AuthenticatedUserContext): boolean {
    const reviewerRoles: UserRole[] = [
      UserRole.EVALUATOR,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ];

    return reviewerRoles.includes(user.role);
  }

  private validateNeedsInfoThreadAccess(
    application: ApplicationWorkflowView,
    user: AuthenticatedUserContext,
  ): void {
    if (this.isReviewerSideUser(user)) {
      return;
    }

    const isTeamMember =
      application.team.leaderId === user.id ||
      application.team.members.some((member) => member.userId === user.id);

    if (!isTeamMember) {
      throw new ForbiddenException(
        'You do not have access to this application',
      );
    }
  }

  private ensureProgramADocumentWorkflow(application: ApplicationWorkflowView) {
    if (application.call.type !== ProgramType.PROGRAM_A) {
      throw new ConflictException(
        'Application document pack is supported only for Program A applications',
      );
    }
  }

  private ensureProgramAMentorshipWorkflow(
    application: ApplicationWorkflowView,
  ): void {
    if (application.call.type !== ProgramType.PROGRAM_A) {
      throw new ConflictException(
        'Program A mentorship is supported only for Program A applications',
      );
    }
  }

  private ensureMentorAssigned(application: ApplicationWorkflowView): void {
    if (!application.mentorUserId) {
      throw new BadRequestException('Application has no assigned mentor');
    }
  }

  private ensureMentorshipAccess(
    application: ApplicationWorkflowView,
    user: AuthenticatedUserContext,
  ): void {
    if (isAdminRole(user.role)) {
      return;
    }

    if (user.role === UserRole.MENTOR && application.mentorUserId === user.id) {
      return;
    }

    throw new ForbiddenException(
      'Only the assigned mentor or an administrator can access mentorship notes',
    );
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

  private ensureApplicationManagedByTeamLeadForNeedsInfo(
    application: ApplicationWorkflowView,
    userId: string,
  ): void {
    if (application.team.leaderId !== userId) {
      throw new ForbiddenException(
        'Only team lead can reply to needs-info requests and resubmit the application',
      );
    }
  }

  private ensureApplicationIsDraft(application: ApplicationWorkflowView): void {
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new ConflictException(
        `Only draft applications can be modified or submitted (status: ${application.status})`,
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

  private async listCalls(input: {
    query: PublicCallsQueryDto;
    activeOnly: boolean;
  }): Promise<PublicCallsResponseDto> {
    const pagination = resolvePagination(input.query);
    const orderBy = buildOrderBy(input.query.sort, input.query.order, [
      { createdAt: input.query.order },
      { id: 'asc' },
    ]);
    const now = new Date();

    const [calls, total] = input.activeOnly
      ? await Promise.all([
          this.callsRepository.findPublicVisibleMany({
            now,
            programType: input.query.type,
            skip: pagination.skip,
            take: pagination.take,
            orderBy,
          }),
          this.callsRepository.countPublicVisible({
            now,
            programType: input.query.type,
          }),
        ])
      : await Promise.all([
          this.callsRepository.findPublicMany({
            programType: input.query.type,
            skip: pagination.skip,
            take: pagination.take,
            orderBy,
          }),
          this.callsRepository.countPublic({
            programType: input.query.type,
          }),
        ]);

    return {
      data: calls.map((call) => this.toPublicCallDto(call)),
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
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

  private toPublicCallDto(call: Call): PublicCallDto {
    return {
      id: call.id,
      title: call.title,
      type: call.type,
      status: call.status,
      opensAt: call.opensAt,
      closesAt: call.closesAt,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
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

  private toNeedsInfoReplyDto(reply: {
    id: string;
    needsInfoItemId: string;
    message: string;
    createdById: string;
    createdAt: Date;
  }): NeedsInfoReplyDto {
    return {
      id: reply.id,
      needsInfoItemId: reply.needsInfoItemId,
      message: reply.message,
      createdById: reply.createdById,
      createdAt: reply.createdAt,
    };
  }

  private toNeedsInfoItemDto(item: {
    id: string;
    applicationId: string;
    message: string;
    dueAt: Date | null;
    status: NeedsInfoItemStatus;
    createdById: string;
    resolvedAt: Date | null;
    resolvedById: string | null;
    createdAt: Date;
    replies?: {
      id: string;
      needsInfoItemId: string;
      message: string;
      createdById: string;
      createdAt: Date;
    }[];
  }): NeedsInfoItemDto {
    return {
      id: item.id,
      applicationId: item.applicationId,
      message: item.message,
      dueAt: item.dueAt,
      status: item.status,
      createdById: item.createdById,
      resolvedAt: item.resolvedAt,
      resolvedById: item.resolvedById,
      createdAt: item.createdAt,
      replies: (item.replies ?? []).map((reply) =>
        this.toNeedsInfoReplyDto(reply),
      ),
    };
  }

  private toApplicationStatusEventDto(event: {
    id: string;
    applicationId: string;
    fromStatus: ApplicationStatus;
    toStatus: ApplicationStatus;
    changedById: string;
    reason: string | null;
    needsInfoItemId: string | null;
    createdAt: Date;
  }): ApplicationStatusEventDto {
    return {
      id: event.id,
      applicationId: event.applicationId,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      changedById: event.changedById,
      reason: event.reason,
      needsInfoItemId: event.needsInfoItemId,
      createdAt: event.createdAt,
    };
  }

  private toProgramAMentorshipNoteDto(
    note: ProgramAMentorshipNoteWithAuthor,
  ): ProgramAMentorshipNoteDto {
    return {
      id: note.id,
      applicationId: note.applicationId,
      content: note.content,
      createdAt: note.createdAt,
      author: this.toMentorshipNoteAuthorDto(note.author),
    };
  }

  private toMentorshipNoteAuthorDto(author: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }): MentorshipNoteAuthorDto {
    return {
      id: author.id,
      email: author.email,
      name: `${author.firstName} ${author.lastName}`.trim(),
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

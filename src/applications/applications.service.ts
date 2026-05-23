import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  ApplicationDocumentScope,
  ApplicationStatus,
  CallStatus,
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
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { ApplicationDocumentsRepository } from './application-documents.repository';
import {
  ApplicationEvaluationsRepository,
  ApplicationEvaluationWithScores,
} from './application-evaluations.repository';
import { ApplicationRulesService } from './rules/application-rules.service';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationDocumentDto } from './dto/application-document.dto';
import { ApplicationEvaluationDto } from './dto/application-evaluation.dto';
import { ApplicationStatusEventDto } from './dto/application-status-event.dto';
import { AssignMentorDto } from './dto/assign-mentor.dto';
import { AttachApplicationDocumentDto } from './dto/attach-application-document.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CreateProgramAMilestoneDto } from './dto/create-program-a-milestone.dto';
import { UpdateProgramAMilestoneDto } from './dto/update-program-a-milestone.dto';
import { ProgramAMilestoneDto } from './dto/program-a-milestone.dto';
import { InternalProgramAApplicationDto } from './dto/internal-program-a-application.dto';
import {
  ApplicationDecision,
  CreateApplicationDecisionDto,
} from './dto/create-application-decision.dto';
import { CreateMentorshipNoteDto } from './dto/create-mentorship-note.dto';
import { CreateNeedsInfoItemDto } from './dto/create-needs-info-item.dto';
import { CreateNeedsInfoReplyDto } from './dto/create-needs-info-reply.dto';
import { DocumentCompletenessDto } from './dto/document-completeness.dto';
import { EligibilitySignalsResponseDto } from './dto/eligibility-signal.dto';
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
import { EligibilitySignalsService } from './eligibility-signals.service';
import { NeedsInfoRepository } from './needs-info.repository';
import {
  ProgramAMentorshipNoteWithAuthor,
  ProgramAMentorshipRepository,
} from './program-a-mentorship.repository';
import {
  ProgramAMilestoneWithApplication,
  ProgramAMilestonesRepository,
} from './program-a-milestones.repository';
import { CreateApplicationEvaluationDto } from './dto/create-application-evaluation.dto';
import { PROGRAM_A_SECTION_KEYS } from './program-a/program-a-application-sections.contract';

type RequiredDocumentSlot = {
  documentType: DocumentType;
  documentScope: ApplicationDocumentScope;
  memberUserId: string | null;
};

type LifecycleTransitionDefinition = {
  from: readonly ApplicationStatus[];
  to: ApplicationStatus;
  reasonRequired?: boolean;
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

  private readonly requiredEvaluationCriterionCodes = [
    'TECHNICAL_QUALITY',
    'BUSINESS_VALUE',
    'TEAM_CAPABILITY',
  ] as const;

  private readonly applicationDocumentAttachTransactionOptions = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  } as const;

  private readonly needsInfoTransactionOptions = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  } as const;

  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly applicationEvaluationsRepository: ApplicationEvaluationsRepository,
    private readonly applicationDocumentsRepository: ApplicationDocumentsRepository,
    private readonly applicationRulesService: ApplicationRulesService,
    private readonly callsRepository: CallsRepository,
    private readonly teamRepository: TeamRepository,
    private readonly filesRepository: FilesRepository,
    private readonly needsInfoRepository: NeedsInfoRepository,
    private readonly eligibilitySignalsService: EligibilitySignalsService,
    private readonly programAMentorshipRepository: ProgramAMentorshipRepository,
    private readonly programAMilestonesRepository: ProgramAMilestonesRepository,
    private readonly userRepository: UserRepository,
    private readonly queueService: QueueService,
  ) {}

  async listInternalProgramAApplications(
    user: AuthenticatedUserContext,
  ): Promise<InternalProgramAApplicationDto[]> {
    if (!this.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        'Only reviewer-side users can list internal Program A applications',
      );
    }

    const applications =
      await this.applicationsRepository.listInternalProgramAApplications();

    return applications.map((application) =>
      this.toInternalProgramAApplicationDto(application),
    );
  }

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

  async getEligibilitySignals(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<EligibilitySignalsResponseDto> {
    const application =
      await this.applicationsRepository.findByIdWithRelations(applicationId);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    this.validateEligibilitySignalsAccess(application, user);

    await this.eligibilitySignalsService.recomputeForApplication(applicationId);

    const signals =
      await this.eligibilitySignalsService.getSignalsForApplication(
        applicationId,
      );

    return {
      applicationId,
      signals,
    };
  }

  async createEvaluation(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: CreateApplicationEvaluationDto,
  ): Promise<ApplicationEvaluationDto> {
    if (!this.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        'Only reviewer-side users can create application evaluations',
      );
    }

    return this.applicationsRepository.transaction(async (db) => {
      const application = await this.loadWorkflowApplicationOrThrow(
        applicationId,
        db,
      );

      this.ensureProgramAApplicationLifecycle(application);
      this.ensureApplicationCanBeEvaluated(application.status);
      this.validateEvaluationScores(dto.scores);

      try {
        const evaluation =
          await this.applicationEvaluationsRepository.createEvaluation(
            {
              applicationId: application.id,
              evaluatorId: user.id,
              recommendation: dto.recommendation,
              comment: dto.comment,
              scores: dto.scores,
            },
            db,
          );

        return this.toApplicationEvaluationDto(evaluation);
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          throw new ConflictException(
            'Evaluator has already submitted an evaluation for this application',
          );
        }

        throw error;
      }
    });
  }

  async listEvaluations(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<ApplicationEvaluationDto[]> {
    if (!this.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        'Only reviewer-side users can view application evaluations',
      );
    }

    const application =
      await this.loadWorkflowApplicationOrThrow(applicationId);

    this.ensureProgramAApplicationLifecycle(application);

    const evaluations =
      await this.applicationEvaluationsRepository.listByApplication(
        application.id,
      );

    return evaluations.map((evaluation) =>
      this.toApplicationEvaluationDto(evaluation),
    );
  }

  async createDecision(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: CreateApplicationDecisionDto,
  ): Promise<ApplicationDetailDto> {
    if (!this.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        'Only reviewer-side users can make application decisions',
      );
    }

    const normalizedRationale = dto.rationale.trim();

    if (!normalizedRationale) {
      throw new BadRequestException('Decision rationale is required');
    }

    const targetStatus =
      dto.decision === ApplicationDecision.APPROVED
        ? ApplicationStatus.APPROVED
        : ApplicationStatus.REJECTED;

    const updatedApplication = await this.applicationsRepository.transaction(
      async (db) => {
        const application = await this.loadWorkflowApplicationOrThrow(
          applicationId,
          db,
        );

        this.ensureProgramAApplicationLifecycle(application);

        if (application.decidedAt) {
          throw new ConflictException('Application is already decided');
        }

        this.ensureApplicationCanBeEvaluated(application.status);

        const evaluations =
          await this.applicationEvaluationsRepository.listByApplication(
            application.id,
            db,
          );

        this.ensureEvaluationCompleteness(evaluations);

        const decidedAt = new Date();

        const updated =
          await this.applicationsRepository.updateDecisionIfCurrent(
            application.id,
            application.status,
            targetStatus,
            user.id,
            normalizedRationale,
            decidedAt,
            db,
          );

        if (updated.count !== 1) {
          throw new ConflictException(
            'Application decision was changed concurrently. Please retry.',
          );
        }

        await this.needsInfoRepository.createStatusEvent(
          {
            applicationId: application.id,
            fromStatus: application.status,
            toStatus: targetStatus,
            changedById: user.id,
            reason: normalizedRationale,
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

    if (updatedApplication.call.type === ProgramType.PROGRAM_A) {
      await this.sendProgramAApplicationEmail(
        updatedApplication,
        targetStatus === ApplicationStatus.APPROVED
          ? EMAIL_JOBS.APPLICATION_APPROVED
          : EMAIL_JOBS.APPLICATION_REJECTED,
      );
    }

    return this.toDetailDto(updatedApplication);
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
          this.ensureRequiredProgramASectionsComplete(application);
          const completeness = this.buildDocumentCompleteness(application);

          if (!completeness.isComplete) {
            throw new ConflictException(
              'Application is missing required documents',
            );
          }
        }

        const now = new Date();
        await this.applicationsRepository.submitDraft(application.id, now, db);
        await this.needsInfoRepository.createStatusEvent(
          {
            applicationId: application.id,
            fromStatus: ApplicationStatus.DRAFT,
            toStatus: ApplicationStatus.SUBMITTED,
            changedById: user.id,
          },
          db,
        );

        await this.eligibilitySignalsService.recomputeForApplication(
          application.id,
          db,
        );

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

    if (submitted.call.type === ProgramType.PROGRAM_A) {
      await this.sendProgramAApplicationEmail(
        submitted,
        EMAIL_JOBS.APPLICATION_SUBMITTED,
      );
    }

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

    const result = await this.applicationsRepository.transaction(async (db) => {
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

      return {
        item: this.toNeedsInfoItemDto({
          ...item,
          replies: [],
        }),
        application,
      };
    }, this.needsInfoTransactionOptions);

    if (result.application.call.type === ProgramType.PROGRAM_A) {
      await this.enqueueNeedsInfoEmail(result.application);
    }

    return result.item;
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

    const result = await this.applicationsRepository.transaction(async (db) => {
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
        assignment: {
          applicationId: assignment.id,
          mentorUserId: assignment.mentorUserId ?? mentor.id,
          assignedAt: assignment.mentorAssignedAt ?? assignedAt,
          assignedById: assignment.mentorAssignedById ?? user.id,
        },
        application,
        mentorEmail: mentor.email,
      };
    });

    await this.enqueueMentorAssignmentEmail(
      result.application,
      result.mentorEmail,
    );

    return result.assignment;
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
      this.ensureArchivedApplicationIsReadOnlyForNonAdmin(application, user);

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

  async createProgramAMilestone(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: CreateProgramAMilestoneDto,
  ): Promise<ProgramAMilestoneDto> {
    return this.applicationsRepository.transaction(async (db) => {
      const application = await this.loadWorkflowApplicationOrThrow(
        applicationId,
        db,
      );

      this.ensureProgramATrackingWorkflow(application);
      this.ensureProgramATrackingAccess(application, user);
      this.ensureArchivedApplicationIsReadOnlyForNonAdmin(application, user);

      const title = dto.title.trim();
      if (title.length === 0) {
        throw new BadRequestException('Milestone title cannot be empty');
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

      return this.toProgramAMilestoneDto(milestone);
    });
  }

  async listProgramAMilestones(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramAMilestoneDto[]> {
    const application =
      await this.loadWorkflowApplicationOrThrow(applicationId);

    this.ensureProgramATrackingWorkflow(application);
    this.ensureProgramATrackingReadAccess(application, user);

    const milestones =
      await this.programAMilestonesRepository.listByApplication(application.id);

    return milestones.map((milestone) =>
      this.toProgramAMilestoneDto(milestone),
    );
  }

  async updateProgramAMilestone(
    applicationId: string,
    milestoneId: string,
    user: AuthenticatedUserContext,
    dto: UpdateProgramAMilestoneDto,
  ): Promise<ProgramAMilestoneDto> {
    return this.applicationsRepository.transaction(async (db) => {
      const application = await this.loadWorkflowApplicationOrThrow(
        applicationId,
        db,
      );

      this.ensureProgramATrackingWorkflow(application);
      this.ensureProgramATrackingAccess(application, user);
      this.ensureArchivedApplicationIsReadOnlyForNonAdmin(application, user);

      const existing =
        await this.programAMilestonesRepository.findByIdForApplication(
          application.id,
          milestoneId,
          db,
        );

      if (!existing) {
        throw new NotFoundException('Program A milestone not found');
      }

      const trimmedTitle = dto.title?.trim();
      if (
        dto.title !== undefined &&
        (!trimmedTitle || trimmedTitle.length === 0)
      ) {
        throw new BadRequestException('Milestone title cannot be empty');
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

      return this.toProgramAMilestoneDto(milestone);
    });
  }

  async startOnboarding(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    return this.transitionLifecycle(applicationId, user, {
      from: [ApplicationStatus.APPROVED],
      to: ApplicationStatus.ONBOARDING,
    });
  }

  async formalVerify(
    applicationId: string,
    user: AuthenticatedUserContext,
    reason?: string,
  ): Promise<ApplicationDetailDto> {
    return this.transitionReviewState(
      applicationId,
      user,
      {
        from: [ApplicationStatus.SUBMITTED],
        to: ApplicationStatus.FORMALLY_VERIFIED,
      },
      reason,
    );
  }

  async startEvaluation(
    applicationId: string,
    user: AuthenticatedUserContext,
    reason?: string,
  ): Promise<ApplicationDetailDto> {
    return this.transitionReviewState(
      applicationId,
      user,
      {
        from: [ApplicationStatus.FORMALLY_VERIFIED],
        to: ApplicationStatus.EVALUATING,
      },
      reason,
    );
  }

  async approve(
    applicationId: string,
    user: AuthenticatedUserContext,
    reason?: string,
  ): Promise<ApplicationDetailDto> {
    return this.transitionReviewState(
      applicationId,
      user,
      {
        from: [ApplicationStatus.EVALUATING],
        to: ApplicationStatus.APPROVED,
        setDecidedAt: true,
        notificationJob: EMAIL_JOBS.APPLICATION_APPROVED,
      },
      reason,
    );
  }

  async reject(
    applicationId: string,
    user: AuthenticatedUserContext,
    reason: string,
  ): Promise<ApplicationDetailDto> {
    return this.transitionReviewState(
      applicationId,
      user,
      {
        from: [
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.FORMALLY_VERIFIED,
          ApplicationStatus.EVALUATING,
          ApplicationStatus.NEEDS_INFO,
        ],
        to: ApplicationStatus.REJECTED,
        reasonRequired: true,
        setDecidedAt: true,
        notificationJob: EMAIL_JOBS.APPLICATION_REJECTED,
      },
      reason,
    );
  }

  async activate(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    return this.transitionLifecycle(applicationId, user, {
      from: [ApplicationStatus.ONBOARDING, ApplicationStatus.PAUSED],
      to: ApplicationStatus.ACTIVE_PROJECT,
    });
  }

  async pause(
    applicationId: string,
    user: AuthenticatedUserContext,
    reason: string,
  ): Promise<ApplicationDetailDto> {
    return this.transitionLifecycle(
      applicationId,
      user,
      {
        from: [ApplicationStatus.ACTIVE_PROJECT],
        to: ApplicationStatus.PAUSED,
        reasonRequired: true,
      },
      reason,
    );
  }

  async complete(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    return this.transitionLifecycle(applicationId, user, {
      from: [ApplicationStatus.ACTIVE_PROJECT],
      to: ApplicationStatus.COMPLETED,
    });
  }

  async archive(
    applicationId: string,
    user: AuthenticatedUserContext,
    reason: string,
  ): Promise<ApplicationDetailDto> {
    return this.transitionLifecycle(
      applicationId,
      user,
      {
        from: [ApplicationStatus.COMPLETED],
        to: ApplicationStatus.ARCHIVED,
        reasonRequired: true,
      },
      reason,
    );
  }

  private ensureApplicationCanBeEvaluated(status: ApplicationStatus): void {
    const allowedStatuses: ApplicationStatus[] = [
      ApplicationStatus.FORMALLY_VERIFIED,
      ApplicationStatus.EVALUATING,
    ];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        `Evaluation workflow is not allowed for application status ${status}`,
      );
    }
  }

  private validateEvaluationScores(
    scores: CreateApplicationEvaluationDto['scores'],
  ): void {
    const requiredCodes = [...this.requiredEvaluationCriterionCodes];
    const submittedCodes = scores.map((score) => score.criterionCode);
    const uniqueCodes = new Set(submittedCodes);

    if (uniqueCodes.size !== submittedCodes.length) {
      throw new BadRequestException('Duplicate evaluation criterion codes');
    }

    const missingCodes = requiredCodes.filter((code) => !uniqueCodes.has(code));

    if (missingCodes.length > 0) {
      throw new BadRequestException(
        `Missing required evaluation criteria: ${missingCodes.join(', ')}`,
      );
    }

    const unknownCodes = submittedCodes.filter(
      (code) => !(requiredCodes as readonly string[]).includes(code),
    );

    if (unknownCodes.length > 0) {
      throw new BadRequestException(
        `Unknown evaluation criteria: ${unknownCodes.join(', ')}`,
      );
    }
  }

  private ensureEvaluationCompleteness(
    evaluations: ApplicationEvaluationWithScores[],
  ): void {
    if (evaluations.length === 0) {
      throw new BadRequestException(
        'At least one complete evaluation is required before final decision',
      );
    }

    const requiredCodes = [...this.requiredEvaluationCriterionCodes];

    const hasCompleteEvaluation = evaluations.some((evaluation) => {
      const scoreCodes = new Set(
        evaluation.scores.map((score) => score.criterionCode),
      );

      return requiredCodes.every((code) => scoreCodes.has(code));
    });

    if (!hasCompleteEvaluation) {
      throw new BadRequestException(
        'At least one evaluation must contain all required criteria before final decision',
      );
    }
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

  private async transitionLifecycle(
    applicationId: string,
    user: AuthenticatedUserContext,
    transition: LifecycleTransitionDefinition,
    reason?: string,
  ): Promise<ApplicationDetailDto> {
    if (!this.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        'Only reviewer-side users can manage Program A application lifecycle',
      );
    }

    const normalizedReason = reason?.trim();

    if (transition.reasonRequired && !normalizedReason) {
      throw new BadRequestException('Reason is required for this transition');
    }

    const updatedApplication = await this.applicationsRepository.transaction(
      async (db) => {
        const application = await this.loadWorkflowApplicationOrThrow(
          applicationId,
          db,
        );

        this.ensureProgramAApplicationLifecycle(application);

        if (!transition.from.includes(application.status)) {
          throw new ConflictException(
            `Invalid application lifecycle transition from ${application.status} to ${transition.to}`,
          );
        }

        const updated = await this.applicationsRepository.updateStatusIfCurrent(
          application.id,
          application.status,
          transition.to,
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
            toStatus: transition.to,
            changedById: user.id,
            reason: normalizedReason,
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
    );

    return this.toDetailDto(updatedApplication);
  }

  private async transitionReviewState(
    applicationId: string,
    user: AuthenticatedUserContext,
    transition: LifecycleTransitionDefinition & {
      setDecidedAt?: boolean;
      notificationJob?:
        | typeof EMAIL_JOBS.APPLICATION_APPROVED
        | typeof EMAIL_JOBS.APPLICATION_REJECTED;
    },
    reason?: string,
  ): Promise<ApplicationDetailDto> {
    if (!this.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        'Only reviewer-side users can manage Program A review transitions',
      );
    }

    const normalizedReason = reason?.trim();

    if (transition.reasonRequired && !normalizedReason) {
      throw new BadRequestException('Reason is required for this transition');
    }

    const updatedApplication = await this.applicationsRepository.transaction(
      async (db) => {
        const application = await this.loadWorkflowApplicationOrThrow(
          applicationId,
          db,
        );

        this.ensureProgramAApplicationLifecycle(application);

        if (!transition.from.includes(application.status)) {
          throw new ConflictException(
            `Invalid application lifecycle transition from ${application.status} to ${transition.to}`,
          );
        }

        const updated = await this.applicationsRepository.updateStatusIfCurrent(
          application.id,
          application.status,
          transition.to,
          db,
          transition.setDecidedAt ? { decidedAt: new Date() } : undefined,
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
            toStatus: transition.to,
            changedById: user.id,
            reason: normalizedReason,
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
    );

    if (transition.notificationJob) {
      await this.sendProgramAApplicationEmail(
        updatedApplication,
        transition.notificationJob,
        normalizedReason,
      );
    }

    return this.toDetailDto(updatedApplication);
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

  private validateEligibilitySignalsAccess(
    application: ApplicationWithRelations,
    user: AuthenticatedUserContext,
  ): void {
    const allowedRoles: UserRole[] = [
      UserRole.EVALUATOR,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ];

    if (allowedRoles.includes(user.role)) {
      return;
    }

    const isTeamMember =
      application.team.leaderId === user.id ||
      application.team.members?.some((member) => member.userId === user.id);

    if (!isTeamMember) {
      throw new ForbiddenException(
        'You do not have permission to view eligibility signals',
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

  private ensureProgramATrackingWorkflow(
    application: ApplicationWorkflowView,
  ): void {
    this.ensureProgramAApplicationLifecycle(application);

    const trackingStatuses: ApplicationStatus[] = [
      ApplicationStatus.APPROVED,
      ApplicationStatus.ONBOARDING,
      ApplicationStatus.ACTIVE_PROJECT,
      ApplicationStatus.PAUSED,
      ApplicationStatus.COMPLETED,
    ];

    if (!trackingStatuses.includes(application.status)) {
      throw new BadRequestException(
        `Program A tracking is allowed only for approved/post-approval applications. Current status: ${application.status}`,
      );
    }
  }

  private ensureProgramATrackingReadAccess(
    application: ApplicationWorkflowView,
    user: AuthenticatedUserContext,
  ): void {
    if (this.isReviewerSideUser(user)) {
      return;
    }

    if (user.role === UserRole.MENTOR && application.mentorUserId === user.id) {
      return;
    }

    throw new ForbiddenException(
      'Only reviewer-side users or the assigned mentor can view Program A tracking',
    );
  }

  private ensureProgramATrackingAccess(
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
      'Only administrators or the assigned mentor can manage Program A tracking',
    );
  }

  private ensureProgramAApplicationLifecycle(
    application: ApplicationWorkflowView,
  ): void {
    if (application.call.type !== ProgramType.PROGRAM_A) {
      throw new ConflictException(
        'Program A post-approval lifecycle is supported only for Program A applications',
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

  private ensureArchivedApplicationIsReadOnlyForNonAdmin(
    application: ApplicationWorkflowView,
    user: AuthenticatedUserContext,
  ): void {
    if (
      application.status === ApplicationStatus.ARCHIVED &&
      !isAdminRole(user.role)
    ) {
      throw new ConflictException(
        'Archived applications are read-only for non-admin users',
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

  private ensureRequiredProgramASectionsComplete(
    application: ApplicationWorkflowView,
  ): void {
    const completedKeys = new Set(
      application.sections
        .filter((section) => section.activeVersion !== null)
        .map((section) => section.key),
    );

    const missingKeys = PROGRAM_A_SECTION_KEYS.filter(
      (key) => !completedKeys.has(key),
    );

    if (missingKeys.length > 0) {
      throw new ConflictException(
        `Application is missing required Program A sections: ${missingKeys.join(', ')}`,
      );
    }
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

  private async enqueueNeedsInfoEmail(
    application: ApplicationWorkflowView,
  ): Promise<void> {
    const recipientEmails = this.getApplicationRecipientEmails(application);

    if (recipientEmails.length === 0) {
      return;
    }

    await Promise.all(
      recipientEmails.map((email) =>
        this.queueService.addEmail(
          EMAIL_JOBS.APPLICATION_NEEDS_INFO_REQUESTED,
          {
            email,
            applicationId: application.id,
            applicationTitle: application.call.title,
          },
        ),
      ),
    );
  }

  private async enqueueMentorAssignmentEmail(
    application: ApplicationWorkflowView,
    mentorEmail: string,
  ): Promise<void> {
    const recipientEmails = [
      ...new Set([
        mentorEmail,
        ...this.getApplicationRecipientEmails(application),
      ]),
    ];

    if (recipientEmails.length === 0) {
      return;
    }

    await Promise.all(
      recipientEmails.map((email) =>
        this.queueService.addEmail(EMAIL_JOBS.APPLICATION_MENTOR_ASSIGNED, {
          email,
          applicationId: application.id,
          applicationTitle: application.call.title,
        }),
      ),
    );
  }

  private async sendProgramAApplicationEmail(
    application: ApplicationWithRelations,
    jobName:
      | typeof EMAIL_JOBS.APPLICATION_SUBMITTED
      | typeof EMAIL_JOBS.APPLICATION_APPROVED
      | typeof EMAIL_JOBS.APPLICATION_REJECTED,
    reason?: string,
  ): Promise<void> {
    const recipientEmails = this.getApplicationRecipientEmails(application);

    if (recipientEmails.length === 0) {
      return;
    }

    await Promise.all(
      recipientEmails.map((email) =>
        this.queueService.addEmail(jobName, {
          email,
          applicationId: application.id,
          applicationTitle: application.call.title,
          ...(jobName === EMAIL_JOBS.APPLICATION_REJECTED
            ? { reason: reason ?? 'No reason provided' }
            : {}),
        } as never),
      ),
    );
  }

  private getApplicationRecipientEmails(
    application: ApplicationWithRelations | ApplicationWorkflowView,
  ): string[] {
    const members = application.team.members as Array<{
      user?: { email?: string | null } | null;
    }>;
    return [
      ...new Set(
        members
          .map((member) => member.user?.email)
          .filter((email): email is string => Boolean(email)),
      ),
    ];
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
      decisionById: application.decisionById,
      decisionRationale: application.decisionRationale,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  private parseNumericConfig(
    value: string | null | undefined,
  ): number | undefined {
    if (value == null || value.trim() === '') {
      return undefined;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toPublicCallDto(call: {
    id: string;
    title: string;
    type: ProgramType;
    status: CallStatus;
    opensAt: Date | null;
    closesAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    requiredDocumentTypes?: Array<{
      id: string;
      documentType: DocumentType;
      isRequired: boolean;
    }>;
    eligibilityRuleConfigs?: Array<{
      code: string;
      threshold: string | null;
    }>;
    programACategories?: Array<{
      value: string;
      label: string;
    }>;
    programAStackTags?: Array<{
      value: string;
      label: string;
    }>;
  }): PublicCallDto {
    const eligibilityRuleConfigs = call.eligibilityRuleConfigs ?? [];

    return {
      id: call.id,
      title: call.title,
      type: call.type,
      status: call.status,
      opensAt: call.opensAt,
      closesAt: call.closesAt,
      requiredDocumentTypes: (call.requiredDocumentTypes ?? []).map(
        (document) => ({
          id: document.id,
          documentType: document.documentType,
          isRequired: document.isRequired,
        }),
      ),
      minTeamSize:
        this.parseNumericConfig(
          eligibilityRuleConfigs.find(
            (config) => config.code === 'TEAM_SIZE_MIN',
          )?.threshold,
        ) ?? null,
      maxTransferredSubjects:
        this.parseNumericConfig(
          eligibilityRuleConfigs.find(
            (config) => config.code === 'TRANSFERRED_SUBJECTS_MAX',
          )?.threshold,
        ) ?? null,
      maxProfileSubjectsAverage:
        this.parseNumericConfig(
          eligibilityRuleConfigs.find(
            (config) => config.code === 'PROFILE_SUBJECTS_AVERAGE_MAX',
          )?.threshold,
        ) ?? null,
      categories: (call.programACategories ?? []).map((category) => ({
        value: category.value,
        label: category.label,
      })),
      stackTags: (call.programAStackTags ?? []).map((stackTag) => ({
        value: stackTag.value,
        label: stackTag.label,
      })),
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

  private toApplicationEvaluationDto(
    evaluation: ApplicationEvaluationWithScores,
  ): ApplicationEvaluationDto {
    return {
      id: evaluation.id,
      applicationId: evaluation.applicationId,
      evaluatorId: evaluation.evaluatorId,
      recommendation: evaluation.recommendation,
      comment: evaluation.comment,
      scores: evaluation.scores.map((score) => ({
        id: score.id,
        evaluationId: score.evaluationId,
        criterionCode: score.criterionCode,
        score: score.score.toString(),
        comment: score.comment,
      })),
      createdAt: evaluation.createdAt,
      updatedAt: evaluation.updatedAt,
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

  private toProgramAMilestoneDto(
    milestone: ProgramAMilestoneWithApplication,
  ): ProgramAMilestoneDto {
    return {
      id: milestone.id,
      applicationId: milestone.applicationId,
      title: milestone.title,
      description: milestone.description,
      dueAt: milestone.dueAt,
      status: milestone.status,
      progressNote: milestone.progressNote,
      createdAt: milestone.createdAt,
      updatedAt: milestone.updatedAt,
    };
  }

  private toInternalProgramAApplicationDto(application: {
    id: string;
    status: ApplicationStatus;
    submittedAt: Date | null;
    decidedAt: Date | null;
    mentorUserId: string | null;
    mentorAssignedAt: Date | null;
    mentorAssignedById: string | null;
    createdAt: Date;
    updatedAt: Date;
    team: {
      id: string;
      name: string;
      leaderId: string;
    };
    call: {
      id: string;
      title: string;
      type: ProgramType;
      status: CallStatus;
      opensAt: Date | null;
      closesAt: Date | null;
    };
    eligibilitySignals: Array<{
      id: string;
      code: string;
      passed: boolean;
      reason: string | null;
    }>;
  }): InternalProgramAApplicationDto {
    return {
      id: application.id,
      status: application.status,
      submittedAt: application.submittedAt,
      decidedAt: application.decidedAt,
      team: application.team,
      call: application.call,
      mentorAssignment: {
        mentorUserId: application.mentorUserId,
        mentorAssignedAt: application.mentorAssignedAt,
        mentorAssignedById: application.mentorAssignedById,
      },
      eligibilitySignalSummary: {
        total: application.eligibilitySignals.length,
        passed: application.eligibilitySignals.filter((signal) => signal.passed)
          .length,
        failed: application.eligibilitySignals.filter(
          (signal) => !signal.passed,
        ).length,
      },
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
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
      firstName: author.firstName,
      lastName: author.lastName,
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

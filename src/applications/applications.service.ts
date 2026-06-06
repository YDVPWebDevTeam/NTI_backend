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
  NeedsInfoItemStatus,
  ProgramType,
  UploadStatus,
} from '../../generated/prisma/enums';
import { isTeamMember } from '../common/auth/role-groups';
import { isPrismaUniqueConstraintError } from '../common/prisma/prisma-error.utils';
import { SERIALIZABLE_TX_OPTIONS } from '../common/prisma/transaction.constants';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { FilesRepository } from '../files/files.repository';
import { TeamRepository } from '../team/team.repository';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { ApplicationDocumentsRepository } from './documents/application-documents.repository';
import { ApplicationEvaluationsRepository } from './evaluations/application-evaluations.repository';
import { ApplicationRulesService } from './rules/application-rules.service';
import { ApplicationAccessService } from './application-access.service';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationDocumentDto } from './dto/application-document.dto';
import { ApplicationEvaluationDto } from './dto/application-evaluation.dto';
import { AttachApplicationDocumentDto } from './dto/attach-application-document.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { InternalProgramAApplicationDto } from '../programs/program-a/dto/internal-program-a-application.dto';
import {
  ApplicationDecision,
  CreateApplicationDecisionDto,
} from './dto/create-application-decision.dto';
import { CreateNeedsInfoItemDto } from './dto/create-needs-info-item.dto';
import { CreateNeedsInfoReplyDto } from './dto/create-needs-info-reply.dto';
import { DocumentCompletenessDto } from './dto/document-completeness.dto';
import { EligibilitySignalsResponseDto } from './dto/eligibility-signal.dto';
import { NeedsInfoItemDto } from './dto/needs-info-item.dto';
import { NeedsInfoReplyDto } from './dto/needs-info-reply.dto';
import { NeedsInfoThreadDto } from './dto/needs-info-thread.dto';
import { ResubmitApplicationDto } from './dto/resubmit-application.dto';
import {
  ApplicationWithRelations,
  ApplicationsRepository,
  ApplicationWorkflowView,
} from './applications.repository';
import { EligibilitySignalsService } from './eligibility-signals/eligibility-signals.service';
import { NeedsInfoRepository } from './needs-info/needs-info.repository';
import { CreateApplicationEvaluationDto } from './dto/create-application-evaluation.dto';
import {
  toApplicationDocumentDto,
  toApplicationEvaluationDto,
  toApplicationStatusEventDto,
  toDetailDto,
  toInternalProgramAApplicationDto,
  toNeedsInfoItemDto,
  toNeedsInfoReplyDto,
} from './application.mappers';
import { APPLICATIONS_MESSAGES } from './applications.messages';
import { UpdateApplicationGrantBudgetDto } from './dto/update-application-grant-budget.dto';

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
  private readonly applicationDocumentAttachTransactionOptions =
    SERIALIZABLE_TX_OPTIONS;

  private readonly needsInfoTransactionOptions = SERIALIZABLE_TX_OPTIONS;

  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly applicationEvaluationsRepository: ApplicationEvaluationsRepository,
    private readonly applicationDocumentsRepository: ApplicationDocumentsRepository,
    private readonly applicationRulesService: ApplicationRulesService,
    private readonly teamRepository: TeamRepository,
    private readonly filesRepository: FilesRepository,
    private readonly needsInfoRepository: NeedsInfoRepository,
    private readonly eligibilitySignalsService: EligibilitySignalsService,
    private readonly queueService: QueueService,
    private readonly applicationAccess: ApplicationAccessService,
  ) {}

  async listInternalProgramAApplications(
    user: AuthenticatedUserContext,
  ): Promise<InternalProgramAApplicationDto[]> {
    if (!this.applicationAccess.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.ONLY_REVIEWER_CAN_LIST_INTERNAL,
      );
    }

    const applications =
      await this.applicationsRepository.listInternalProgramAApplications(
        user.id,
      );

    return applications.map((application) =>
      toInternalProgramAApplicationDto(application),
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
            APPLICATIONS_MESSAGES.ACTIVE_APPLICATION_ALREADY_EXISTS,
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
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          'An active application for this team and call already exists',
        );
      }
      throw error;
    }

    return toDetailDto(created);
  }

  async findById(
    id: string,
    requestingUser: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    const application =
      await this.applicationsRepository.findByIdWithRelations(id);

    if (!application) {
      throw new NotFoundException(APPLICATIONS_MESSAGES.APPLICATION_NOT_FOUND);
    }

    this.applicationAccess.validateApplicationAccess(
      application,
      requestingUser,
    );

    return toDetailDto(application);
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

        this.applicationAccess.ensureProgramADocumentWorkflow(application);
        this.applicationAccess.ensureApplicationManagedByTeamLead(
          application,
          user.id,
        );
        this.applicationAccess.ensureApplicationIsDraft(application);

        const slot = this.resolveAttachmentSlot(application, dto);
        const uploadedFile = await this.filesRepository.findByIdForOwners(
          dto.fileId,
          slot.allowedOwnerIds,
          db,
        );

        if (!uploadedFile) {
          throw new BadRequestException(
            APPLICATIONS_MESSAGES.FILE_NOT_EXIST_OR_CANNOT_ATTACH,
          );
        }

        if (uploadedFile.status !== UploadStatus.UPLOADED) {
          throw new BadRequestException(
            APPLICATIONS_MESSAGES.FILE_MUST_BE_UPLOADED,
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
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          APPLICATIONS_MESSAGES.DOCUMENT_ATTACHED_CONCURRENTLY,
        );
      }

      throw error;
    }

    return toApplicationDocumentDto(document);
  }

  async getDocumentCompleteness(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<DocumentCompletenessDto> {
    const application =
      await this.loadWorkflowApplicationOrThrow(applicationId);

    this.applicationAccess.validateApplicationAccess(application, user);

    return this.buildDocumentCompleteness(application);
  }

  async getEligibilitySignals(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<EligibilitySignalsResponseDto> {
    const application =
      await this.applicationsRepository.findByIdWithRelations(applicationId);

    if (!application) {
      throw new NotFoundException(APPLICATIONS_MESSAGES.APPLICATION_NOT_FOUND);
    }

    this.applicationAccess.validateEligibilitySignalsAccess(application, user);

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
    if (!this.applicationAccess.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.ONLY_REVIEWER_CAN_CREATE_EVALUATIONS,
      );
    }

    return this.applicationsRepository.transaction(async (db) => {
      const application = await this.loadWorkflowApplicationOrThrow(
        applicationId,
        db,
      );

      this.applicationAccess.ensureProgramAApplicationLifecycle(application);
      this.applicationAccess.ensureApplicationCanBeEvaluated(
        application.status,
      );
      this.applicationAccess.validateEvaluationScores(dto.scores);

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

        return toApplicationEvaluationDto(evaluation);
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          throw new ConflictException(
            APPLICATIONS_MESSAGES.EVALUATOR_ALREADY_SUBMITTED,
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
    if (!this.applicationAccess.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.ONLY_REVIEWER_CAN_VIEW_EVALUATIONS,
      );
    }

    const application =
      await this.loadWorkflowApplicationOrThrow(applicationId);

    this.applicationAccess.ensureProgramAApplicationLifecycle(application);

    const evaluations =
      await this.applicationEvaluationsRepository.listByApplication(
        application.id,
      );

    return evaluations.map((evaluation) =>
      toApplicationEvaluationDto(evaluation),
    );
  }

  async createDecision(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: CreateApplicationDecisionDto,
  ): Promise<ApplicationDetailDto> {
    if (!this.applicationAccess.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.ONLY_REVIEWER_CAN_MAKE_DECISIONS,
      );
    }

    const normalizedRationale = dto.rationale.trim();

    if (!normalizedRationale) {
      throw new BadRequestException(
        APPLICATIONS_MESSAGES.DECISION_RATIONALE_REQUIRED,
      );
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

        this.applicationAccess.ensureProgramAApplicationLifecycle(application);

        if (application.decidedAt) {
          throw new ConflictException(
            APPLICATIONS_MESSAGES.APPLICATION_ALREADY_DECIDED,
          );
        }

        this.applicationAccess.ensureApplicationCanBeEvaluated(
          application.status,
        );

        const evaluations =
          await this.applicationEvaluationsRepository.listByApplication(
            application.id,
            db,
          );

        this.applicationAccess.ensureEvaluationCompleteness(evaluations);

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
            APPLICATIONS_MESSAGES.APPLICATION_DECISION_CHANGED_CONCURRENTLY,
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
          throw new NotFoundException(
            APPLICATIONS_MESSAGES.APPLICATION_NOT_FOUND,
          );
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

    return toDetailDto(updatedApplication);
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

        this.applicationAccess.ensureApplicationManagedByTeamLead(
          application,
          user.id,
        );
        this.applicationAccess.ensureApplicationIsDraft(application);
        this.applicationAccess.ensureApplicationCanBeSubmitted(application);

        if (application.call.type === ProgramType.PROGRAM_A) {
          this.applicationAccess.ensureRequiredProgramASectionsComplete(
            application,
          );
          const completeness = this.buildDocumentCompleteness(application);

          if (!completeness.isComplete) {
            throw new ConflictException(
              APPLICATIONS_MESSAGES.APPLICATION_IS_MISSING_DOCUMENTS,
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
          throw new NotFoundException(
            APPLICATIONS_MESSAGES.APPLICATION_NOT_FOUND,
          );
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

    return toDetailDto(submitted);
  }

  async createNeedsInfoItem(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: CreateNeedsInfoItemDto,
  ): Promise<NeedsInfoItemDto> {
    if (!this.applicationAccess.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.ONLY_REVIEWER_CAN_REQUEST_INFO,
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
          APPLICATIONS_MESSAGES.APPLICATION_STATUS_CHANGED_CONCURRENTLY,
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
        item: toNeedsInfoItemDto({
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

      this.applicationAccess.ensureApplicationManagedByTeamLeadForNeedsInfo(
        application,
        user.id,
      );

      if (application.status !== ApplicationStatus.NEEDS_INFO) {
        throw new BadRequestException(
          APPLICATIONS_MESSAGES.NEEDS_INFO_REPLIES_ONLY_IN_NEEDS_INFO_STATUS,
        );
      }

      const item = await this.needsInfoRepository.findItemForApplication(
        application.id,
        itemId,
        db,
      );

      if (!item) {
        throw new NotFoundException(
          APPLICATIONS_MESSAGES.NEEDS_INFO_ITEM_NOT_FOUND,
        );
      }

      if (item.status === NeedsInfoItemStatus.RESOLVED) {
        throw new ConflictException(
          APPLICATIONS_MESSAGES.NEEDS_INFO_ITEM_ALREADY_RESOLVED,
        );
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

      return toNeedsInfoReplyDto(reply);
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

        this.applicationAccess.ensureApplicationManagedByTeamLeadForNeedsInfo(
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
          throw new NotFoundException(
            APPLICATIONS_MESSAGES.APPLICATION_NOT_FOUND,
          );
        }

        return refreshed;
      },
      this.needsInfoTransactionOptions,
    );

    return toDetailDto(updatedApplication);
  }

  async getNeedsInfoThread(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<NeedsInfoThreadDto> {
    const application =
      await this.loadWorkflowApplicationOrThrow(applicationId);

    this.applicationAccess.validateNeedsInfoThreadAccess(application, user);

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
      items: items.map((item) => toNeedsInfoItemDto(item)),
      statusEvents: statusEvents.map((event) =>
        toApplicationStatusEventDto(event),
      ),
    };
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

  async updateGrantBudget(
    applicationId: string,
    dto: UpdateApplicationGrantBudgetDto,
    user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    if (!this.applicationAccess.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.ONLY_REVIEWER_CAN_CREATE_EVALUATIONS,
      );
    }

    await this.applicationsRepository.update(
      { id: applicationId },
      { grantBudget: dto.grantBudget ?? null },
    );

    const refreshed =
      await this.applicationsRepository.findByIdWithRelations(applicationId);

    if (!refreshed) {
      throw new NotFoundException(APPLICATIONS_MESSAGES.APPLICATION_NOT_FOUND);
    }

    return toDetailDto(refreshed);
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
      throw new NotFoundException(APPLICATIONS_MESSAGES.APPLICATION_NOT_FOUND);
    }

    return application;
  }

  private async transitionLifecycle(
    applicationId: string,
    user: AuthenticatedUserContext,
    transition: LifecycleTransitionDefinition,
    reason?: string,
  ): Promise<ApplicationDetailDto> {
    if (!this.applicationAccess.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        'Only reviewer-side users can manage Program A application lifecycle',
      );
    }

    const normalizedReason = reason?.trim();

    if (transition.reasonRequired && !normalizedReason) {
      throw new BadRequestException(
        APPLICATIONS_MESSAGES.REASON_REQUIRED_FOR_TRANSITION,
      );
    }

    const updatedApplication = await this.applicationsRepository.transaction(
      async (db) => {
        const application = await this.loadWorkflowApplicationOrThrow(
          applicationId,
          db,
        );

        this.applicationAccess.ensureProgramAApplicationLifecycle(application);

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
          throw new NotFoundException(
            APPLICATIONS_MESSAGES.APPLICATION_NOT_FOUND,
          );
        }

        return refreshed;
      },
    );

    return toDetailDto(updatedApplication);
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
    if (!this.applicationAccess.isReviewerSideUser(user)) {
      throw new ForbiddenException(
        'Only reviewer-side users can manage Program A review transitions',
      );
    }

    const normalizedReason = reason?.trim();

    if (transition.reasonRequired && !normalizedReason) {
      throw new BadRequestException(
        APPLICATIONS_MESSAGES.REASON_REQUIRED_FOR_TRANSITION,
      );
    }

    const updatedApplication = await this.applicationsRepository.transaction(
      async (db) => {
        const application = await this.loadWorkflowApplicationOrThrow(
          applicationId,
          db,
        );

        this.applicationAccess.ensureProgramAApplicationLifecycle(application);

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
          throw new NotFoundException(
            APPLICATIONS_MESSAGES.APPLICATION_NOT_FOUND,
          );
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

    return toDetailDto(updatedApplication);
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

      if (!isTeamMember(application.team, dto.memberUserId)) {
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

    if (jobName === EMAIL_JOBS.APPLICATION_REJECTED) {
      await Promise.all(
        recipientEmails.map((email) =>
          this.queueService.addEmail(EMAIL_JOBS.APPLICATION_REJECTED, {
            email,
            applicationId: application.id,
            applicationTitle: application.call.title,
            reason: reason ?? 'No reason provided',
          }),
        ),
      );
      return;
    }

    await Promise.all(
      recipientEmails.map((email) =>
        this.queueService.addEmail(jobName, {
          email,
          applicationId: application.id,
          applicationTitle: application.call.title,
        }),
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
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  ApplicationStatus,
  ProgramType,
  UserRole,
} from '../../generated/prisma/enums';
import { isAdminRole } from '../auth/admin-role.helper';
import { isReviewerRole, isTeamMember } from '../common/auth/role-groups';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ApplicationEvaluationWithScores } from './evaluations/application-evaluations.repository';
import {
  ApplicationWithRelations,
  ApplicationWorkflowView,
} from './applications.repository';
import { CreateApplicationEvaluationDto } from './dto/create-application-evaluation.dto';
import { ApplicationRulesService } from './rules/application-rules.service';
import { PROGRAM_A_SECTION_KEYS } from '../programs/program-a/program-a-application-sections.contract';
import { APPLICATIONS_MESSAGES } from './applications.messages';

const REQUIRED_EVALUATION_CRITERION_CODES = [
  'TECHNICAL_QUALITY',
  'BUSINESS_VALUE',
  'TEAM_CAPABILITY',
] as const;

const PROGRAM_A_TRACKING_STATUSES: readonly ApplicationStatus[] = [
  ApplicationStatus.APPROVED,
  ApplicationStatus.ONBOARDING,
  ApplicationStatus.ACTIVE_PROJECT,
  ApplicationStatus.PAUSED,
  ApplicationStatus.COMPLETED,
];

@Injectable()
export class ApplicationAccessService {
  constructor(
    private readonly applicationRulesService: ApplicationRulesService,
  ) {}

  isReviewerSideUser(user: AuthenticatedUserContext): boolean {
    return isReviewerRole(user.role);
  }

  ensureApplicationCanBeEvaluated(status: ApplicationStatus): void {
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

  validateEvaluationScores(
    scores: CreateApplicationEvaluationDto['scores'],
  ): void {
    const requiredCodes = [...REQUIRED_EVALUATION_CRITERION_CODES];
    const submittedCodes = scores.map((score) => score.criterionCode);
    const uniqueCodes = new Set(submittedCodes);

    if (uniqueCodes.size !== submittedCodes.length) {
      throw new BadRequestException(
        APPLICATIONS_MESSAGES.DUPLICATE_EVALUATION_CRITERION_CODES,
      );
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

  ensureEvaluationCompleteness(
    evaluations: ApplicationEvaluationWithScores[],
  ): void {
    if (evaluations.length === 0) {
      throw new BadRequestException(
        APPLICATIONS_MESSAGES.AT_LEAST_ONE_EVALUATION_REQUIRED,
      );
    }

    const requiredCodes = [...REQUIRED_EVALUATION_CRITERION_CODES];

    const hasCompleteEvaluation = evaluations.some((evaluation) => {
      const scoreCodes = new Set(
        evaluation.scores.map((score) => score.criterionCode),
      );

      return requiredCodes.every((code) => scoreCodes.has(code));
    });

    if (!hasCompleteEvaluation) {
      throw new BadRequestException(
        APPLICATIONS_MESSAGES.AT_LEAST_ONE_COMPLETE_EVALUATION,
      );
    }
  }

  validateNeedsInfoThreadAccess(
    application: ApplicationWorkflowView,
    user: AuthenticatedUserContext,
  ): void {
    if (this.isReviewerSideUser(user)) {
      return;
    }

    if (!isTeamMember(application.team, user.id)) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.NO_ACCESS_TO_APPLICATION,
      );
    }
  }

  validateEligibilitySignalsAccess(
    application: ApplicationWithRelations,
    user: AuthenticatedUserContext,
  ): void {
    if (this.isReviewerSideUser(user)) {
      return;
    }

    if (!isTeamMember(application.team, user.id)) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.NO_PERMISSION_VIEW_ELIGIBILITY,
      );
    }
  }

  ensureProgramADocumentWorkflow(application: ApplicationWorkflowView): void {
    if (application.call.type !== ProgramType.PROGRAM_A) {
      throw new ConflictException(
        APPLICATIONS_MESSAGES.PROGRAM_A_DOC_PACK_ONLY,
      );
    }
  }

  ensureProgramAMentorshipWorkflow(application: ApplicationWorkflowView): void {
    if (application.call.type !== ProgramType.PROGRAM_A) {
      throw new ConflictException(
        APPLICATIONS_MESSAGES.PROGRAM_A_MENTORSHIP_ONLY,
      );
    }
  }

  ensureProgramATrackingWorkflow(application: ApplicationWorkflowView): void {
    this.ensureProgramAApplicationLifecycle(application);

    if (!PROGRAM_A_TRACKING_STATUSES.includes(application.status)) {
      throw new BadRequestException(
        `Program A tracking is allowed only for approved/post-approval applications. Current status: ${application.status}`,
      );
    }
  }

  ensureProgramATrackingReadAccess(
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
      APPLICATIONS_MESSAGES.ONLY_REVIEWER_OR_MENTOR_CAN_VIEW_TRACKING,
    );
  }

  ensureProgramATrackingAccess(
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
      APPLICATIONS_MESSAGES.ONLY_ADMIN_OR_MENTOR_CAN_MANAGE_TRACKING,
    );
  }

  ensureProgramAApplicationLifecycle(
    application: ApplicationWorkflowView,
  ): void {
    if (application.call.type !== ProgramType.PROGRAM_A) {
      throw new ConflictException(
        APPLICATIONS_MESSAGES.PROGRAM_A_LIFECYCLE_ONLY,
      );
    }
  }

  ensureMentorAssigned(application: ApplicationWorkflowView): void {
    if (!application.mentorUserId) {
      throw new BadRequestException(
        APPLICATIONS_MESSAGES.APPLICATION_HAS_NO_ASSIGNED_MENTOR,
      );
    }
  }

  ensureMentorshipAccess(
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
      APPLICATIONS_MESSAGES.ONLY_ADMIN_OR_MENTOR_CAN_ACCESS_NOTES,
    );
  }

  ensureArchivedApplicationIsReadOnlyForNonAdmin(
    application: ApplicationWorkflowView,
    user: AuthenticatedUserContext,
  ): void {
    if (
      application.status === ApplicationStatus.ARCHIVED &&
      !isAdminRole(user.role)
    ) {
      throw new ConflictException(
        APPLICATIONS_MESSAGES.ARCHIVED_APPS_READ_ONLY,
      );
    }
  }

  ensureApplicationManagedByTeamLead(
    application: ApplicationWorkflowView,
    userId: string,
  ): void {
    if (application.team.leaderId !== userId) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.ONLY_TEAM_LEAD_CAN_MANAGE_DOCS,
      );
    }
  }

  ensureApplicationManagedByTeamLeadForNeedsInfo(
    application: ApplicationWorkflowView,
    userId: string,
  ): void {
    if (application.team.leaderId !== userId) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.ONLY_TEAM_LEAD_CAN_REPLY_NEEDS_INFO,
      );
    }
  }

  ensureApplicationIsDraft(application: ApplicationWorkflowView): void {
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new ConflictException(
        `Only draft applications can be modified or submitted (status: ${application.status})`,
      );
    }
  }

  ensureApplicationCanBeSubmitted(application: ApplicationWorkflowView): void {
    if (application.team.archivedAt !== null) {
      throw new ConflictException(
        APPLICATIONS_MESSAGES.TEAM_ARCHIVED_CANNOT_SUBMIT,
      );
    }

    this.applicationRulesService.ensureCallOpenForApplications(
      application.call,
    );
  }

  ensureRequiredProgramASectionsComplete(
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

  validateApplicationAccess(
    application: ApplicationWithRelations | ApplicationWorkflowView,
    user: AuthenticatedUserContext,
  ): void {
    if (isAdminRole(user.role)) {
      return;
    }

    if (!isTeamMember(application.team, user.id)) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.NO_PERMISSION_VIEW_APPLICATION,
      );
    }
  }
}

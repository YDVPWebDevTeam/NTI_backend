import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProgramType } from '../../../generated/prisma/enums';
import { createPaginationQueryDecorators } from '../../common/pagination';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { ApplicationSectionDto } from '../dto/application-section.dto';
import { ApplicationSectionHistoryDto } from '../dto/application-section-history.dto';
import { APPLICATION_SECTION_KEYS } from '../dto/application-section-key.constants';
import { ApplicationLifecycleTransitionDto } from '../dto/application-lifecycle-transition.dto';
import { AssignMentorDto } from '../dto/assign-mentor.dto';
import { ApplicationDetailDto } from '../dto/application-detail.dto';
import { ApplicationDocumentDto } from '../dto/application-document.dto';
import { ApplicationEvaluationDto } from '../dto/application-evaluation.dto';
import { AttachApplicationDocumentDto } from '../dto/attach-application-document.dto';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { CreateApplicationDecisionDto } from '../dto/create-application-decision.dto';
import { CreateApplicationEvaluationDto } from '../dto/create-application-evaluation.dto';
import { CreateMentorshipNoteDto } from '../dto/create-mentorship-note.dto';
import { CreateNeedsInfoItemDto } from '../dto/create-needs-info-item.dto';
import { CreateNeedsInfoReplyDto } from '../dto/create-needs-info-reply.dto';
import { DocumentCompletenessDto } from '../dto/document-completeness.dto';
import { EligibilitySignalsResponseDto } from '../dto/eligibility-signal.dto';
import { MentorAssignmentDto } from '../dto/mentor-assignment.dto';
import { NeedsInfoItemDto } from '../dto/needs-info-item.dto';
import { NeedsInfoReplyDto } from '../dto/needs-info-reply.dto';
import { NeedsInfoThreadDto } from '../dto/needs-info-thread.dto';
import { OptionalApplicationTransitionNoteDto } from '../dto/optional-application-transition-note.dto';
import { ProgramAMentorshipNoteDto } from '../dto/program-a-mentorship-note.dto';
import { PublicCallDto } from '../dto/public-call.dto';
import { PUBLIC_CALL_SORT_VALUES } from '../dto/public-calls-query.dto';
import { PublicCallsResponseDto } from '../dto/public-calls-response.dto';
import { RequiredDocumentsResponseDto } from '../dto/required-documents-response.dto';
import { ResubmitApplicationDto } from '../dto/resubmit-application.dto';
import { SetActiveSectionVersionDto } from '../dto/set-active-section-version.dto';
import { UpsertApplicationSectionDto } from '../dto/upsert-application-section.dto';

export const CreateApplicationApi = () =>
  createApiDecorator({
    summary: 'Create draft application',
    description:
      'Creates a draft application for a team in a target call when the call is open and within its application window, the team is not archived, and the requester is the team lead.',
    body: CreateApplicationDto,
    successResponse: {
      status: 201,
      type: ApplicationDetailDto,
      description: 'Draft application was created.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description:
          'Request validation failed or the call is outside its application window.',
      }),
      ApiForbiddenResponse({ description: 'Insufficient permissions.' }),
      ApiConflictResponse({
        description:
          'An active application for this team and call already exists, or the call/team state does not allow creating a draft.',
      }),
      ApiNotFoundResponse({
        description: 'Related entities were not found.',
      }),
    ],
  });

export const GetApplicationApi = () =>
  createApiDecorator({
    summary: 'Get application by id',
    description: 'Returns application details by identifier.',
    successResponse: {
      status: 200,
      type: ApplicationDetailDto,
      description: 'Application details.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Invalid application id format.',
      }),
      ApiForbiddenResponse({ description: 'Insufficient permissions.' }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const GetPublicCallsApi = () =>
  createApiDecorator({
    summary: 'List public calls',
    description:
      'Returns a paginated list of publicly visible calls using only public-safe fields.',
    successResponse: {
      status: 200,
      type: PublicCallsResponseDto,
      description: 'Paginated public calls.',
    },
    extraDecorators: [
      ...createPaginationQueryDecorators({
        sortValues: PUBLIC_CALL_SORT_VALUES,
        sortDescription: 'Sortable public call fields.',
        defaultSort: 'closesAt',
        defaultOrder: 'asc',
      }),
      ApiQuery({
        name: 'type',
        required: false,
        enum: ProgramType,
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Query parameters are invalid.',
      }),
    ],
  });

export const GetPublicActiveCallsApi = () =>
  createApiDecorator({
    summary: 'List active public calls',
    description:
      'Returns a paginated list of public calls that are OPEN and currently within their visibility date window.',
    successResponse: {
      status: 200,
      type: PublicCallsResponseDto,
      description: 'Paginated active public calls.',
    },
    extraDecorators: [
      ...createPaginationQueryDecorators({
        sortValues: PUBLIC_CALL_SORT_VALUES,
        sortDescription: 'Sortable public call fields.',
        defaultSort: 'closesAt',
        defaultOrder: 'asc',
      }),
      ApiQuery({
        name: 'type',
        required: false,
        enum: ProgramType,
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Query parameters are invalid.',
      }),
    ],
  });

export const GetPublicCallByIdApi = () =>
  createApiDecorator({
    summary: 'Get public call by id',
    description:
      'Returns public call details when the call exists and is allowed to be exposed publicly.',
    successResponse: {
      status: 200,
      type: PublicCallDto,
      description: 'Public call details.',
    },
    errors: [
      ApiBadRequestResponse({
        description: 'Call identifier is malformed.',
      }),
      ApiNotFoundResponse({
        description: 'Public call was not found.',
      }),
    ],
  });

export const GetRequiredDocumentsApi = () =>
  createApiDecorator({
    summary: 'Get required documents for call',
    description:
      'Returns the configured required document types for a call. Program B calls return an empty requiredDocuments list.',
    successResponse: {
      status: 200,
      type: RequiredDocumentsResponseDto,
      description: 'Required document configuration for the call.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Invalid call id format.' }),
      ApiNotFoundResponse({ description: 'Call was not found.' }),
    ],
  });

export const AttachApplicationDocumentApi = () =>
  createApiDecorator({
    summary: 'Attach application document',
    description:
      'Attaches an already uploaded file to an application document slot. Team lead only. CV attachments require memberUserId and count per team member.',
    body: AttachApplicationDocumentDto,
    successResponse: {
      status: 201,
      type: ApplicationDocumentDto,
      description: 'Document attachment was created successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Invalid file ownership, upload state, or document scope.',
      }),
      ApiForbiddenResponse({
        description: 'Only the team lead may manage application documents.',
      }),
      ApiConflictResponse({
        description:
          'Application document pack is not supported for this application, the application is not draft, or another document update won the slot concurrently.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const GetApplicationDocumentCompletenessApi = () =>
  createApiDecorator({
    summary: 'Get application document completeness',
    description:
      'Returns the exact required document slots that are satisfied or missing for the application.',
    successResponse: {
      status: 200,
      type: DocumentCompletenessDto,
      description: 'Document completeness result for the application.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Invalid application id format.' }),
      ApiForbiddenResponse({ description: 'Insufficient permissions.' }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const GetEligibilitySignalsApi = () =>
  createApiDecorator({
    summary: 'Get application eligibility signals',
    description:
      'Recomputes and returns eligibility signals for an application. Accessible to reviewer-side users and application team members.',
    successResponse: {
      status: 200,
      type: EligibilitySignalsResponseDto,
      description: 'Eligibility signals for the application.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Invalid application id format.' }),
      ApiForbiddenResponse({
        description: 'User has no access to eligibility signals.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const CreateApplicationEvaluationApi = () =>
  createApiDecorator({
    summary: 'Create application evaluation',
    description:
      'Reviewer-side users can submit one criterion-based evaluation for an application in FORMALLY_VERIFIED or EVALUATING status. The MVP requires TECHNICAL_QUALITY, BUSINESS_VALUE, and TEAM_CAPABILITY scores.',
    body: CreateApplicationEvaluationDto,
    successResponse: {
      status: 201,
      type: ApplicationEvaluationDto,
      description: 'Application evaluation was created.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description:
          'Invalid application id, invalid status, duplicate criteria, unknown criteria, or missing required criteria.',
      }),
      ApiForbiddenResponse({
        description: 'Only reviewer-side users can create evaluations.',
      }),
      ApiConflictResponse({
        description:
          'The evaluator has already submitted an evaluation for this application.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const ListApplicationEvaluationsApi = () =>
  createApiDecorator({
    summary: 'List application evaluations',
    description:
      'Returns criterion-based evaluations for an application. Reviewer-side users only.',
    successResponse: {
      status: 200,
      type: ApplicationEvaluationDto,
      isArray: true,
      description: 'Application evaluations.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Invalid application id format.' }),
      ApiForbiddenResponse({
        description: 'Only reviewer-side users can view evaluations.',
      }),
      ApiConflictResponse({
        description:
          'Application does not belong to the supported Program A workflow.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const CreateApplicationDecisionApi = () =>
  createApiDecorator({
    summary: 'Create final application decision',
    description:
      'Reviewer-side users can approve or reject an application after at least one complete evaluation exists. The decision stores status, decidedAt, decisionById, decisionRationale, and creates an application status event.',
    body: CreateApplicationDecisionDto,
    successResponse: {
      status: 200,
      type: ApplicationDetailDto,
      description: 'Application decision was created.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description:
          'Invalid payload, invalid application status, missing rationale, or evaluation completeness precondition failed.',
      }),
      ApiForbiddenResponse({
        description: 'Only reviewer-side users can make application decisions.',
      }),
      ApiConflictResponse({
        description:
          'Application is already decided or decision was changed concurrently.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const ListApplicationSectionsApi = () =>
  createApiDecorator({
    summary: 'List application sections',
    description:
      'Returns all sections for an application with resolved active values.',
    successResponse: {
      status: 200,
      type: ApplicationSectionDto,
      isArray: true,
      description: 'Application sections.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Invalid application id format.' }),
      ApiForbiddenResponse({ description: 'Insufficient permissions.' }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const SubmitApplicationApi = () =>
  createApiDecorator({
    summary: 'Submit application',
    description:
      'Submits a draft application. Program A submissions require a complete document pack. Successful submission locks the team.',
    successResponse: {
      status: 200,
      type: ApplicationDetailDto,
      description: 'Application was submitted successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description:
          'Invalid application id format, or the call is outside its opensAt/closesAt application window.',
      }),
      ApiForbiddenResponse({
        description: 'Only the team lead may submit the application.',
      }),
      ApiConflictResponse({
        description:
          'Call is not open for applications, application is not in a submittable state, or required documents are missing.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const UpsertApplicationSectionApi = () =>
  createApiDecorator({
    summary: 'Upsert application section',
    description:
      'Creates or updates one application section and stores its history snapshot.',
    body: UpsertApplicationSectionDto,
    successResponse: {
      status: 200,
      type: ApplicationSectionDto,
      description: 'Application section was saved.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'key',
        description: 'Supported application section key.',
        enum: APPLICATION_SECTION_KEYS,
        enumName: 'ApplicationSectionKey',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Invalid identifiers or payload.' }),
      ApiForbiddenResponse({
        description: 'Only team lead can update sections.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const CreateNeedsInfoItemApi = () =>
  createApiDecorator({
    summary: 'Request additional information for application',
    description:
      'Reviewer-side users can request additional information for submitted applications. The application moves to NEEDS_INFO.',
    body: CreateNeedsInfoItemDto,
    successResponse: {
      status: 201,
      type: NeedsInfoItemDto,
      description: 'Needs-info item was created.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Invalid application id or invalid application status.',
      }),
      ApiForbiddenResponse({
        description:
          'Only reviewer-side users can request additional information.',
      }),
      ApiConflictResponse({
        description: 'Application status was changed concurrently.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const AssignMentorApi = () =>
  createApiDecorator({
    summary: 'Assign mentor to Program A application',
    description:
      'Assigns or reassigns the current mentor for an approved-or-later Program A application. Admin and super-admin only.',
    body: AssignMentorDto,
    successResponse: {
      status: 201,
      type: MentorAssignmentDto,
      description: 'Mentor assignment was saved.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description:
          'Invalid application id, invalid mentor id, unsupported application status, or target user is not a mentor.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can assign mentors.',
      }),
      ApiConflictResponse({
        description:
          'Application does not belong to the Program A mentorship workflow.',
      }),
      ApiNotFoundResponse({
        description: 'Application or mentor user was not found.',
      }),
    ],
  });

export const CreateMentorshipNoteApi = () =>
  createApiDecorator({
    summary: 'Create Program A mentorship note',
    description:
      'Creates an append-only mentorship note for a Program A application. Accessible to the assigned mentor, admin, and super-admin.',
    body: CreateMentorshipNoteDto,
    successResponse: {
      status: 201,
      type: ProgramAMentorshipNoteDto,
      description: 'Mentorship note was created.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description:
          'Invalid application id or the application has no assigned mentor.',
      }),
      ApiForbiddenResponse({
        description:
          'Only the assigned mentor or an administrator can create mentorship notes.',
      }),
      ApiConflictResponse({
        description:
          'Application does not belong to the Program A mentorship workflow.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const GetMentorshipNotesApi = () =>
  createApiDecorator({
    summary: 'List Program A mentorship notes',
    description:
      'Returns mentorship notes for a Program A application in deterministic ascending order.',
    successResponse: {
      status: 200,
      type: ProgramAMentorshipNoteDto,
      isArray: true,
      description: 'Mentorship notes.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description:
          'Invalid application id or the application has no assigned mentor.',
      }),
      ApiForbiddenResponse({
        description:
          'Only the assigned mentor or an administrator can view mentorship notes.',
      }),
      ApiConflictResponse({
        description:
          'Application does not belong to the Program A mentorship workflow.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const ReplyToNeedsInfoItemApi = () =>
  createApiDecorator({
    summary: 'Reply to needs-info item',
    description:
      'Team lead can reply to an open needs-info item while the application is in NEEDS_INFO status.',
    body: CreateNeedsInfoReplyDto,
    successResponse: {
      status: 201,
      type: NeedsInfoReplyDto,
      description: 'Needs-info reply was created.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Invalid id format or application is not in NEEDS_INFO.',
      }),
      ApiForbiddenResponse({
        description: 'Only team lead can reply to needs-info requests.',
      }),
      ApiConflictResponse({
        description: 'Needs-info item is already resolved.',
      }),
      ApiNotFoundResponse({
        description: 'Application or needs-info item was not found.',
      }),
    ],
  });

export const GetSectionHistoryApi = () =>
  createApiDecorator({
    summary: 'Get section change history',
    description: 'Returns the history snapshots for a section. Admin only.',
    successResponse: {
      status: 200,
      type: ApplicationSectionHistoryDto,
      isArray: true,
      description: 'Section history entries.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'key',
        description: 'Supported application section key.',
        enum: APPLICATION_SECTION_KEYS,
        enumName: 'ApplicationSectionKey',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Invalid identifiers or key.' }),
      ApiForbiddenResponse({ description: 'Admin access required.' }),
      ApiNotFoundResponse({
        description: 'Application or section was not found.',
      }),
    ],
  });

export const ResubmitApplicationApi = () =>
  createApiDecorator({
    summary: 'Resubmit application after needs-info replies',
    description:
      'Team lead can resubmit an application from NEEDS_INFO to EVALUATING after all needs-info items have been answered.',
    body: ResubmitApplicationDto,
    successResponse: {
      status: 200,
      type: ApplicationDetailDto,
      description: 'Application was resubmitted.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description:
          'Application is not in NEEDS_INFO, has no unresolved needs-info items, or still has open items.',
      }),
      ApiForbiddenResponse({
        description: 'Only team lead can resubmit the application.',
      }),
      ApiConflictResponse({
        description: 'Application status was changed concurrently.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const GetNeedsInfoThreadApi = () =>
  createApiDecorator({
    summary: 'Get needs-info thread',
    description:
      'Returns needs-info items, replies, and application status events for the application.',
    successResponse: {
      status: 200,
      type: NeedsInfoThreadDto,
      description: 'Needs-info thread.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Invalid application id format.' }),
      ApiForbiddenResponse({
        description: 'User has no access to this application.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

export const SetActiveSectionVersionApi = () =>
  createApiDecorator({
    summary: 'Set active section version',
    description:
      'Pins a historical version as the active payload for a section. Admin only.',
    body: SetActiveSectionVersionDto,
    successResponse: {
      status: 200,
      type: ApplicationSectionDto,
      description: 'Active section version was updated.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'key',
        description: 'Supported application section key.',
        enum: APPLICATION_SECTION_KEYS,
        enumName: 'ApplicationSectionKey',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Invalid application id format.' }),
      ApiBadRequestResponse({
        description:
          'Request body validation failed, for example version must be an integer greater than or equal to 1.',
      }),
      ApiBadRequestResponse({ description: 'Version not found in history.' }),
      ApiForbiddenResponse({ description: 'Admin access required.' }),
      ApiNotFoundResponse({
        description: 'Application or section was not found.',
      }),
    ],
  });

function createAdminLifecycleTransitionApi(config: {
  summary: string;
  description: string;
  body?: typeof ApplicationLifecycleTransitionDto;
  forbiddenDescription?: string;
}) {
  return createApiDecorator({
    summary: config.summary,
    description: config.description,
    body: config.body,
    successResponse: {
      status: 200,
      type: ApplicationDetailDto,
      description: 'Application lifecycle state was updated.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description:
          'Invalid application id format or request body validation failed.',
      }),
      ApiForbiddenResponse({
        description:
          config.forbiddenDescription ??
          'Only reviewer-side users may manage Program A post-approval lifecycle transitions.',
      }),
      ApiConflictResponse({
        description:
          'Application is not a Program A application, the current lifecycle state does not allow this transition, or another update changed the status concurrently.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });
}

function createReviewerDecisionTransitionApi(config: {
  summary: string;
  description: string;
  body?:
    | typeof OptionalApplicationTransitionNoteDto
    | typeof ApplicationLifecycleTransitionDto;
}) {
  return createApiDecorator({
    summary: config.summary,
    description: config.description,
    body: config.body,
    successResponse: {
      status: 200,
      type: ApplicationDetailDto,
      description: 'Application review state was updated.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description:
          'Invalid application id format or request body validation failed.',
      }),
      ApiForbiddenResponse({
        description:
          'Only reviewer-side users may manage Program A review transitions.',
      }),
      ApiConflictResponse({
        description:
          'Application is not a Program A application, the current review state does not allow this transition, or another update changed the status concurrently.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });
}

export const FormalVerifyApplicationApi = () =>
  createReviewerDecisionTransitionApi({
    summary: 'Formal verify Program A application',
    description:
      'Moves a Program A application from SUBMITTED to FORMALLY_VERIFIED. Reviewer-side users only.',
    body: OptionalApplicationTransitionNoteDto,
  });

export const StartEvaluationApplicationApi = () =>
  createReviewerDecisionTransitionApi({
    summary: 'Start Program A evaluation',
    description:
      'Moves a Program A application from FORMALLY_VERIFIED to EVALUATING. Reviewer-side users only.',
    body: OptionalApplicationTransitionNoteDto,
  });

export const ApproveApplicationApi = () =>
  createReviewerDecisionTransitionApi({
    summary: 'Approve Program A application',
    description:
      'Moves a Program A application from EVALUATING to APPROVED and records an optional reviewer note. Reviewer-side users only.',
    body: OptionalApplicationTransitionNoteDto,
  });

export const RejectApplicationApi = () =>
  createReviewerDecisionTransitionApi({
    summary: 'Reject Program A application',
    description:
      'Moves a Program A application to REJECTED from an active review state and stores the provided reason. Reviewer-side users only.',
    body: ApplicationLifecycleTransitionDto,
  });

export const StartApplicationOnboardingApi = () =>
  createAdminLifecycleTransitionApi({
    summary: 'Start Program A onboarding',
    description:
      'Moves a Program A application from APPROVED to ONBOARDING. Reviewer-side users only.',
    forbiddenDescription:
      'Only reviewer-side users may manage Program A post-approval lifecycle transitions.',
  });

export const ActivateApplicationApi = () =>
  createAdminLifecycleTransitionApi({
    summary: 'Activate Program A application',
    description:
      'Moves a Program A application from ONBOARDING to ACTIVE_PROJECT or from PAUSED back to ACTIVE_PROJECT. Reviewer-side users only.',
  });

export const PauseApplicationApi = () =>
  createAdminLifecycleTransitionApi({
    summary: 'Pause Program A application',
    description:
      'Moves a Program A application from ACTIVE_PROJECT to PAUSED and stores the provided reason. Reviewer-side users only.',
    body: ApplicationLifecycleTransitionDto,
  });

export const CompleteApplicationApi = () =>
  createAdminLifecycleTransitionApi({
    summary: 'Complete Program A application',
    description:
      'Moves a Program A application from ACTIVE_PROJECT to COMPLETED. Reviewer-side users only.',
  });

export const ArchiveApplicationApi = () =>
  createAdminLifecycleTransitionApi({
    summary: 'Archive Program A application',
    description:
      'Moves a Program A application from COMPLETED to ARCHIVED and stores the provided reason. Reviewer-side users only.',
    body: ApplicationLifecycleTransitionDto,
  });

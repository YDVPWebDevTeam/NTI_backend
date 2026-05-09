import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProgramType } from '../../../generated/prisma/enums';
import { createPaginationQueryDecorators } from '../../common/pagination';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { ApplicationDetailDto } from '../dto/application-detail.dto';
import { ApplicationDocumentDto } from '../dto/application-document.dto';
import { AttachApplicationDocumentDto } from '../dto/attach-application-document.dto';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { CreateNeedsInfoItemDto } from '../dto/create-needs-info-item.dto';
import { CreateNeedsInfoReplyDto } from '../dto/create-needs-info-reply.dto';
import { DocumentCompletenessDto } from '../dto/document-completeness.dto';
import { NeedsInfoItemDto } from '../dto/needs-info-item.dto';
import { NeedsInfoReplyDto } from '../dto/needs-info-reply.dto';
import { NeedsInfoThreadDto } from '../dto/needs-info-thread.dto';
import { PublicCallDto } from '../dto/public-call.dto';
import { PUBLIC_CALL_SORT_VALUES } from '../dto/public-calls-query.dto';
import { PublicCallsResponseDto } from '../dto/public-calls-response.dto';
import { RequiredDocumentsResponseDto } from '../dto/required-documents-response.dto';
import { ResubmitApplicationDto } from '../dto/resubmit-application.dto';

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
      ApiBadRequestResponse({
        description: 'Invalid application id format.',
      }),
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

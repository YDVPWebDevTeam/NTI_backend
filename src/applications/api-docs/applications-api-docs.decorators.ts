import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { ApplicationDetailDto } from '../dto/application-detail.dto';
import { ApplicationDocumentDto } from '../dto/application-document.dto';
import { AttachApplicationDocumentDto } from '../dto/attach-application-document.dto';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { DocumentCompletenessDto } from '../dto/document-completeness.dto';
import { RequiredDocumentsResponseDto } from '../dto/required-documents-response.dto';

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
          'Application document pack is not supported for this application.',
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
      ApiBadRequestResponse({ description: 'Invalid application id format.' }),
      ApiForbiddenResponse({
        description: 'Only the team lead may submit the application.',
      }),
      ApiConflictResponse({
        description:
          'Application is not in a submittable state or required documents are missing.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

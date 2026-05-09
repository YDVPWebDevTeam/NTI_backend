import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { ApplicationSectionDto } from '../dto/application-section.dto';
import { ApplicationSectionHistoryDto } from '../dto/application-section-history.dto';
import { ApplicationDetailDto } from '../dto/application-detail.dto';
import { CreateApplicationDto } from '../dto/create-application.dto';
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
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Invalid identifiers or payload.' }),
      ApiForbiddenResponse({
        description: 'Only team lead can update sections.',
      }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
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
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiForbiddenResponse({ description: 'Admin access required.' }),
      ApiNotFoundResponse({
        description: 'Application or section was not found.',
      }),
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
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Version not found in history.' }),
      ApiForbiddenResponse({ description: 'Admin access required.' }),
      ApiNotFoundResponse({
        description: 'Application or section was not found.',
      }),
    ],
  });

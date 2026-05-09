import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { ProgramType } from '../../../generated/prisma/enums';
import { createPaginationQueryDecorators } from '../../common/pagination';
import { ApplicationDetailDto } from '../dto/application-detail.dto';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { PublicCallDto } from '../dto/public-call.dto';
import { PUBLIC_CALL_SORT_VALUES } from '../dto/public-calls-query.dto';
import { PublicCallsResponseDto } from '../dto/public-calls-response.dto';

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

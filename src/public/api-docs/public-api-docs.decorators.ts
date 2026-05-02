import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { PublicCallDetailDto } from '../dto/public-call-detail.dto';
import { PublicCallsResponseDto } from '../dto/public-calls-response.dto';
import { PublicProgramDto } from '../dto/public-program.dto';
import { PUBLIC_CALL_SORT_VALUES } from '../dto/public-calls-query.dto';

export const GetPublicProgramsApi = () =>
  createApiDecorator({
    summary: 'List public programs',
    description:
      'Returns the public program catalog derived from supported program types.',
    successResponse: {
      status: 200,
      type: PublicProgramDto,
      isArray: true,
      description: 'Public program catalog.',
    },
  });

export const GetPublicProgramCallsApi = () =>
  createApiDecorator({
    summary: 'List public calls for a program',
    description:
      'Returns publicly visible OPEN calls for the requested program.',
    successResponse: {
      status: 200,
      type: PublicCallsResponseDto,
      description: 'Paginated public calls for the program.',
    },
    extraDecorators: [
      ApiParam({
        name: 'programId',
        description: 'Program identifier or slug.',
      }),
      ApiQuery({
        name: 'page',
        required: false,
        example: 1,
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        example: 20,
      }),
      ApiQuery({
        name: 'sort',
        required: false,
        enum: PUBLIC_CALL_SORT_VALUES,
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Query parameters are invalid.',
      }),
      ApiNotFoundResponse({
        description: 'Program was not found.',
      }),
    ],
  });

export const GetPublicCallByIdApi = () =>
  createApiDecorator({
    summary: 'Get public call by id',
    description: 'Returns a single publicly visible OPEN call by identifier.',
    successResponse: {
      status: 200,
      type: PublicCallDetailDto,
      description: 'Public call details.',
    },
    extraDecorators: [
      ApiParam({
        name: 'id',
        description: 'Call identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Call identifier is malformed.',
      }),
      ApiNotFoundResponse({
        description: 'Public call was not found.',
      }),
    ],
  });

export const GetActivePublicCallsApi = () =>
  createApiDecorator({
    summary: 'List active public calls',
    description:
      'Returns paginated publicly visible OPEN calls, optionally filtered by program.',
    successResponse: {
      status: 200,
      type: PublicCallsResponseDto,
      description: 'Paginated active public calls.',
    },
    extraDecorators: [
      ApiQuery({
        name: 'programId',
        required: false,
        description: 'Program identifier or slug.',
      }),
      ApiQuery({
        name: 'page',
        required: false,
        example: 1,
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        example: 20,
      }),
      ApiQuery({
        name: 'sort',
        required: false,
        enum: PUBLIC_CALL_SORT_VALUES,
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Query parameters are invalid.',
      }),
      ApiNotFoundResponse({
        description: 'Program was not found.',
      }),
    ],
  });

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
import { createApiDecorator } from '../../../../infrastructure/api-docs/api-docs-factory';
import { CreateTeamApplicationDto } from '../dto/create-team-application.dto';
import { ProgramBTeamApplicationResponseDto } from '../dto/team-application-response.dto';

export const SubmitTeamApplicationApi = () =>
  createApiDecorator({
    summary: 'Submit a team application',
    description:
      'Allows a team leader to submit an application for a published Program B backlog item. The team is identified explicitly via teamId.',
    body: {
      type: CreateTeamApplicationDto,
      description: 'Application details.',
      examples: {
        'Minimal application': {
          summary: 'Minimal application with proposal text',
          value: {
            teamId: '550e8400-e29b-41d4-a716-446655440000',
            motivation: 'Our team is excited to work on this project.',
            proposalText: 'We propose to implement using microservices.',
            cvFileIds: ['550e8400-e29b-41d4-a716-446655440001'],
          },
        },
        'Application with proposal file': {
          summary: 'Application using a proposal file instead of text',
          value: {
            teamId: '550e8400-e29b-41d4-a716-446655440000',
            motivation: 'We have the best team for this task.',
            proposalFileId: '550e8400-e29b-41d4-a716-446655440002',
            cvFileIds: [
              '550e8400-e29b-41d4-a716-446655440003',
              '550e8400-e29b-41d4-a716-446655440004',
            ],
          },
        },
      },
    },
    successResponse: {
      status: 201,
      type: ProgramBTeamApplicationResponseDto,
      description: 'Application was submitted successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'backlogItemId',
        description: 'Published backlog item identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Request body is invalid or required fields are missing.',
      }),
      ApiForbiddenResponse({
        description:
          'Only the team leader may submit an application for their team.',
      }),
      ApiNotFoundResponse({
        description: 'Backlog item or team was not found.',
      }),
      ApiConflictResponse({
        description:
          'Backlog item is not published or an active application already exists for this team and backlog item or the team is archived.',
      }),
    ],
  });

export const GetMyTeamApplicationApi = () =>
  createApiDecorator({
    summary: 'Get my team application',
    description:
      'Returns the application for the given backlog item and team. The requester must be the leader of the specified team.',
    successResponse: {
      status: 200,
      type: ProgramBTeamApplicationResponseDto,
      description: 'Application was retrieved successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'backlogItemId',
        description: 'Backlog item identifier.',
        format: 'uuid',
      }),
      ApiQuery({
        name: 'teamId',
        description: 'Team identifier.',
        format: 'uuid',
        required: true,
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Query parameters are invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only the team leader may view their team application.',
      }),
      ApiNotFoundResponse({
        description: 'Application was not found.',
      }),
    ],
  });

export const WithdrawTeamApplicationApi = () =>
  createApiDecorator({
    summary: 'Withdraw a team application',
    description:
      'Withdraws a submitted team application. The status is changed to WITHDRAWN. Only the team leader may withdraw.',
    successResponse: {
      status: 200,
      type: ProgramBTeamApplicationResponseDto,
      description: 'Application was withdrawn successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'applicationId',
        description: 'Application identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Identifier is malformed.',
      }),
      ApiForbiddenResponse({
        description: 'Only the team leader may withdraw the application.',
      }),
      ApiNotFoundResponse({
        description: 'Application was not found.',
      }),
      ApiConflictResponse({
        description: 'Withdrawal is allowed only from SUBMITTED status.',
      }),
    ],
  });

import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { ApplicationDetailDto } from '../dto/application-detail.dto';
import { CreateApplicationDto } from '../dto/create-application.dto';

export const CreateApplicationApi = () =>
  createApiDecorator({
    summary: 'Create draft application',
    description:
      'Creates a draft application for a team in a target call. Additional eligibility and ownership checks will be expanded in subsequent implementation steps.',
    body: CreateApplicationDto,
    successResponse: {
      status: 201,
      type: ApplicationDetailDto,
      description: 'Draft application was created.',
    },
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiForbiddenResponse({ description: 'Insufficient permissions.' }),
      ApiConflictResponse({
        description:
          'An active application for this team and call already exists.',
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
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiForbiddenResponse({ description: 'Insufficient permissions.' }),
      ApiNotFoundResponse({ description: 'Application was not found.' }),
    ],
  });

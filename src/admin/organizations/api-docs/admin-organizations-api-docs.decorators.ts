import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../../infrastructure/api-docs/api-docs-factory';
import { AdminOrganizationResponseDto } from '../dto/admin-organization-response.dto';
import { OrganizationStatusResponseDto } from '../dto/organization-status-response.dto';
import { UpdateOrgStatusDto } from '../dto/update-org-status.dto';

export const GetAdminOrganizationApi = () =>
  createApiDecorator({
    summary: 'Get organization (admin)',
    description:
      'Returns organization profile by id for administrators, including the single company owner summary.',
    successResponse: {
      status: 200,
      type: AdminOrganizationResponseDto,
      description: 'Organization payload with owner summary.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can access this resource.',
      }),
      ApiNotFoundResponse({
        description: 'Organization or organization owner was not found.',
      }),
    ],
  });

export const UpdateOrganizationStatusApi = () =>
  createApiDecorator({
    summary: 'Process organization status',
    description:
      'Allows ADMIN and SUPER_ADMIN to approve or reject organizations that are pending review.',
    body: UpdateOrgStatusDto,
    successResponse: {
      status: 200,
      type: OrganizationStatusResponseDto,
      description: 'Organization status was updated successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiBadRequestResponse({
        description:
          'Request body is invalid or the organization has already been processed.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'The authenticated user is not allowed to process organization status.',
      }),
      ApiNotFoundResponse({
        description: 'Organization was not found.',
      }),
    ],
  });

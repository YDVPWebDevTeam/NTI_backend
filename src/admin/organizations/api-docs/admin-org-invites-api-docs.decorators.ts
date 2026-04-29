import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../../infrastructure/api-docs/api-docs-factory';
import { OrganizationStatusResponseDto } from '../dto/organization-status-response.dto';

export const GetAllOrgInvitesApi = () =>
  createApiDecorator({
    summary: 'List organization applications',
    description:
      'Returns pending organization applications (organization records awaiting review) for ADMIN and SUPER_ADMIN.',
    successResponse: {
      status: 200,
      type: OrganizationStatusResponseDto,
      isArray: true,
      description: 'Organization applications were retrieved successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only administrators can access organization applications.',
      }),
    ],
  });

export const GetOrganizationInvitesApi = () =>
  createApiDecorator({
    summary: 'Get organization application by organization',
    description:
      'Returns the organization application for a specific organization id for ADMIN and SUPER_ADMIN.',
    successResponse: {
      status: 200,
      type: OrganizationStatusResponseDto,
      isArray: true,
      description: 'Organization application was retrieved successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only administrators can access organization applications.',
      }),
      ApiNotFoundResponse({
        description: 'Organization was not found.',
      }),
    ],
  });

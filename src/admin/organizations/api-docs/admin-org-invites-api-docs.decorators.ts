import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../../infrastructure/api-docs/api-docs-factory';
import { OrganizationInviteItemDto } from '../../../organization/dto/organization-invite-item.dto';

export const GetAllOrgInvitesApi = () =>
  createApiDecorator({
    operationId: 'adminListOrganizationInvites',
    summary: 'List organization invites',
    description:
      'Returns organization invite records across all organizations for ADMIN and SUPER_ADMIN.',
    successResponse: {
      status: 200,
      type: OrganizationInviteItemDto,
      isArray: true,
      description: 'Organization invite records were retrieved successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can access organization invites.',
      }),
    ],
  });

export const GetOrganizationInvitesApi = () =>
  createApiDecorator({
    operationId: 'adminListOrganizationInvitesByOrganization',
    summary: 'List organization invites by organization',
    description:
      'Returns organization invite records for a specific organization id for ADMIN and SUPER_ADMIN.',
    successResponse: {
      status: 200,
      type: OrganizationInviteItemDto,
      isArray: true,
      description: 'Organization invite records were retrieved successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can access organization invites.',
      }),
      ApiNotFoundResponse({
        description: 'Organization was not found.',
      }),
    ],
  });

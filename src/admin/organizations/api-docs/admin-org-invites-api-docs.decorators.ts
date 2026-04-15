import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../../infrastructure/api-docs/api-docs-factory';
import { OrgInviteResponseDto } from '../dto/org-invite-response.dto';

export const GetAllOrgInvitesApi = () =>
  createApiDecorator({
    summary: 'List organization invitations',
    description:
      'Returns all organization invitations across organizations for ADMIN and SUPER_ADMIN.',
    successResponse: {
      status: 200,
      type: OrgInviteResponseDto,
      isArray: true,
      description: 'Organization invitations were retrieved successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can access organization invitations.',
      }),
    ],
  });

export const GetOrganizationInvitesApi = () =>
  createApiDecorator({
    summary: 'List organization invitations by organization',
    description:
      'Returns all invitations for a specific organization for ADMIN and SUPER_ADMIN.',
    successResponse: {
      status: 200,
      type: OrgInviteResponseDto,
      isArray: true,
      description: 'Organization invitations were retrieved successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can access organization invitations.',
      }),
      ApiNotFoundResponse({
        description: 'Organization was not found.',
      }),
    ],
  });

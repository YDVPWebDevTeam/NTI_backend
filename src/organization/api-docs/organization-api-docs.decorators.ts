import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { CreateOrganizationInviteDto } from '../dto/create-organization-invite.dto';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { OrganizationInviteResponseDto } from '../dto/organization-invite-response.dto';
import { OrganizationResponseDto } from '../dto/organization-response.dto';

export const CreateOrganizationApi = () =>
  createApiDecorator({
    summary: 'Create organization',
    description:
      'Creates an organization for the authenticated company owner, links the owner to it, and enqueues an organization review notification for administrators.',
    body: CreateOrganizationDto,
    successResponse: {
      status: 201,
      type: OrganizationResponseDto,
      description: 'Organization was created successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiBadRequestResponse({
        description: 'Request body is invalid.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only company owners may create organizations.',
      }),
      ApiConflictResponse({
        description:
          'ICO already exists or the authenticated user is already linked to an organization.',
      }),
    ],
  });

export const CreateOrganizationInviteApi = () =>
  createApiDecorator({
    summary: 'Create organization invitation',
    description:
      'Creates a pending invitation for an employee to join the authenticated company owner organization and enqueues the invitation email.',
    body: CreateOrganizationInviteDto,
    successResponse: {
      status: 201,
      type: OrganizationInviteResponseDto,
      description: 'Organization invitation was created successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Organization identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Request body is invalid or organization identifier is malformed.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only the company owner of this organization may create invitations.',
      }),
      ApiNotFoundResponse({
        description: 'Organization not found.',
      }),
      ApiConflictResponse({
        description:
          'A user with this email already exists or an active invitation already exists.',
      }),
    ],
  });

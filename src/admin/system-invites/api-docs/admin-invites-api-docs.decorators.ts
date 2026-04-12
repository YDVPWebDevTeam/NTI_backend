import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../../infrastructure/api-docs/api-docs-factory';
import { CreateSystemInviteDto } from '../dto/create-system-invite.dto';
import { SystemInviteResponseDto } from '../dto/system-invite-response.dto';

export const CreateSystemInviteApi = () =>
  createApiDecorator({
    summary: 'Create system invitation',
    description:
      'Allows SUPER_ADMIN to invite ADMIN, MENTOR, and EVALUATOR; ADMIN can invite MENTOR and EVALUATOR only.',
    body: CreateSystemInviteDto,
    successResponse: {
      status: 201,
      type: SystemInviteResponseDto,
      description: 'Invitation created and email dispatch queued.',
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
        description:
          'The authenticated user is not allowed to invite the requested role.',
      }),
      ApiConflictResponse({
        description:
          'An account with this email already exists or an active invite already exists for this email and role.',
      }),
    ],
  });

import { ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { InviteValidationResponseDto } from '../dto/invite-validation-response.dto';
import { ValidateInviteDto } from '../dto/validate-invite.dto';

export const ValidateInviteApi = () =>
  createApiDecorator({
    summary: 'Validate invitation token',
    description:
      'Validates a team invitation token and returns the invited email together with the target team name.',
    body: ValidateInviteDto,
    successResponse: {
      status: 200,
      type: InviteValidationResponseDto,
      description: 'Invitation token is valid.',
    },
    errors: [
      ApiNotFoundResponse({
        description: 'Invitation token was not found.',
      }),
      ApiBadRequestResponse({
        description:
          'Invitation token is expired, revoked, or already accepted.',
      }),
    ],
  });

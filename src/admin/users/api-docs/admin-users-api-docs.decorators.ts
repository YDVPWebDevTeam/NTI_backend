import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUserDto } from '../../../auth/dto/authenticated-user.dto';
import { createApiDecorator } from '../../../infrastructure/api-docs/api-docs-factory';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';

export const UpdateUserStatusApi = () =>
  createApiDecorator({
    summary: 'Update user status',
    description:
      'Allows ADMIN and SUPER_ADMIN accounts to suspend or reactivate a user account.',
    body: UpdateUserStatusDto,
    successResponse: {
      status: 200,
      type: AuthenticatedUserDto,
      description: 'User status was updated successfully.',
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
          'The authenticated user is not allowed to change the target account status.',
      }),
      ApiNotFoundResponse({
        description: 'Target user was not found.',
      }),
    ],
  });

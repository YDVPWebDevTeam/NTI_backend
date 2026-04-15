import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUserDto } from '../../../auth/dto/authenticated-user.dto';
import { createApiDecorator } from '../../../infrastructure/api-docs/api-docs-factory';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';

export const GetUsersAdminApi = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get users',
      description:
        'Allows ADMIN and SUPER_ADMIN accounts to fetch all user accounts.',
    }),
    ApiOkResponse({
      type: AuthenticatedUserDto,
      isArray: true,
      description: 'Users were fetched successfully.',
    }),
    ApiBearerAuth('access-token'),
    ApiUnauthorizedResponse({
      description: 'Bearer token is missing or invalid.',
    }),
    ApiForbiddenResponse({
      description: 'Only administrators can access users.',
    }),
  );

export const GetUserByIdAdminApi = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get user by id',
      description:
        'Allows ADMIN and SUPER_ADMIN accounts to fetch one user account by identifier.',
    }),
    ApiOkResponse({
      type: AuthenticatedUserDto,
      description: 'User was fetched successfully.',
    }),
    ApiBearerAuth('access-token'),
    ApiBadRequestResponse({
      description: 'User id must be a valid UUID.',
    }),
    ApiUnauthorizedResponse({
      description: 'Bearer token is missing or invalid.',
    }),
    ApiForbiddenResponse({
      description: 'Only administrators can access users.',
    }),
    ApiNotFoundResponse({
      description: 'Target user was not found.',
    }),
  );

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

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../../infrastructure/api-docs/api-docs-factory';
import { createPaginationQueryDecorators } from '../../../common/pagination';
import { AuthenticatedUserDto } from '../../../auth/dto/authenticated-user.dto';
import { ListUsersResponseDto } from '../dto/list-users-response.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { USER_SORT_VALUES } from '../dto/list-users-query.dto';

export const GetUsersAdminApi = () =>
  createApiDecorator({
    summary: 'List users (admin)',
    description:
      'Returns a paginated, filterable, and sortable list of all user accounts for administrators.',
    successResponse: {
      status: 200,
      type: ListUsersResponseDto,
      description: 'Paginated user list.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ...createPaginationQueryDecorators({
        sortValues: USER_SORT_VALUES,
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can access users.',
      }),
    ],
  });

export const GetUserByIdAdminApi = () =>
  createApiDecorator({
    summary: 'Get user by id',
    description:
      'Allows ADMIN and SUPER_ADMIN accounts to fetch one user account by identifier.',
    successResponse: {
      status: 200,
      type: AuthenticatedUserDto,
      description: 'User was fetched successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
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
    ],
  });

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

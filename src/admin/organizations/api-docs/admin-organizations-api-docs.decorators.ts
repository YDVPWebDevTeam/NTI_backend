import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { OrganizationStatus } from '../../../../generated/prisma/enums';
import { createApiDecorator } from '../../../infrastructure/api-docs/api-docs-factory';
import { createPaginationQueryDecorators } from '../../../common/pagination';
import { AdminOrganizationResponseDto } from '../dto/admin-organization-response.dto';
import { ListOrganizationsResponseDto } from '../dto/list-organizations-response.dto';
import { OrganizationStatusResponseDto } from '../dto/organization-status-response.dto';
import { UpdateOrgStatusDto } from '../dto/update-org-status.dto';
import { ORG_SORT_VALUES } from '../dto/list-organizations-query.dto';

export const GetAdminOrganizationsApi = () =>
  createApiDecorator({
    summary: 'List organizations (admin)',
    description:
      'Returns a paginated, filterable, and sortable list of all organizations for administrators.',
    successResponse: {
      status: 200,
      type: ListOrganizationsResponseDto,
      description: 'Paginated organization list.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ...createPaginationQueryDecorators({
        sortValues: ORG_SORT_VALUES,
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
      }),
      ApiQuery({
        name: 'q',
        required: false,
        type: String,
        description: 'Search by organization name or ICO.',
      }),
      ApiQuery({
        name: 'status',
        required: false,
        enum: OrganizationStatus,
        description: 'Filter by organization status.',
      }),
      ApiQuery({
        name: 'sector',
        required: false,
        type: String,
        description: 'Filter by sector (partial, case-insensitive match).',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Query parameters are invalid.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can access this resource.',
      }),
    ],
  });

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

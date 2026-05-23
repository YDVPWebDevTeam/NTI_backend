import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  BacklogItemStatus,
  ProgramBProjectStatus,
} from '../../../../../generated/prisma/enums';
import { createApiDecorator } from '../../../../infrastructure/api-docs/api-docs-factory';
import { CompanyBacklogSummaryDto } from '../dto/company-backlog-summary.dto';
import { COMPANY_BACKLOG_SUMMARY_SORT_VALUES } from '../dto/company-backlog-summary-query.dto';
import { ProgramBCompanyOverviewDto } from '../dto/program-b-company-overview.dto';
import { CompanyProjectSummaryDto } from '../dto/company-project-summary.dto';
import { COMPANY_PROJECT_SUMMARY_SORT_VALUES } from '../dto/company-project-summary-query.dto';

const authDecorators = [ApiBearerAuth('access-token')];
const commonErrors = [
  ApiBadRequestResponse({ description: 'Query parameters are invalid.' }),
  ApiUnauthorizedResponse({
    description: 'Bearer token is missing or invalid.',
  }),
  ApiForbiddenResponse({
    description:
      'Only active COMPANY_OWNER and COMPANY_EMPLOYEE users linked to an active organization can access the company overview.',
  }),
];

export const GetProgramBCompanyOverviewApi = () =>
  createApiDecorator({
    summary: 'Get Program B company overview',
    description:
      'Returns the organization-scoped Program B company overview for the authenticated company user, including top-level backlog, candidate, project, and pending-action counts.',
    successResponse: {
      status: 200,
      type: ProgramBCompanyOverviewDto,
      description: 'Aggregated Program B company overview.',
    },
    extraDecorators: authDecorators,
    errors: commonErrors,
  });

export const GetCompanyBacklogSummaryApi = () =>
  createApiDecorator({
    summary: 'Get Program B company backlog summary',
    description:
      'Returns a lightweight organization-scoped Program B backlog preview for the Program B company overview.',
    successResponse: {
      status: 200,
      type: CompanyBacklogSummaryDto,
      description: 'Backlog preview rows for the Program B company overview.',
    },
    extraDecorators: [
      ...authDecorators,
      ApiQuery({ name: 'limit', required: false, type: Number, example: 5 }),
      ApiQuery({
        name: 'status',
        required: false,
        enum: BacklogItemStatus,
        description: 'Optional backlog status filter.',
      }),
      ApiQuery({
        name: 'sort',
        required: false,
        enum: COMPANY_BACKLOG_SUMMARY_SORT_VALUES,
        description: 'Deterministic summary sort field.',
      }),
      ApiQuery({
        name: 'order',
        required: false,
        enum: ['asc', 'desc'],
        description: 'Sort direction.',
      }),
    ],
    errors: commonErrors,
  });

export const GetCompanyProjectSummaryApi = () =>
  createApiDecorator({
    summary: 'Get Program B company project summary',
    description:
      'Returns a lightweight organization-scoped Program B project preview for the Program B company overview.',
    successResponse: {
      status: 200,
      type: CompanyProjectSummaryDto,
      description: 'Project preview rows for the Program B company overview.',
    },
    extraDecorators: [
      ...authDecorators,
      ApiQuery({ name: 'limit', required: false, type: Number, example: 5 }),
      ApiQuery({
        name: 'status',
        required: false,
        enum: ProgramBProjectStatus,
        description: 'Optional project status filter.',
      }),
      ApiQuery({
        name: 'sort',
        required: false,
        enum: COMPANY_PROJECT_SUMMARY_SORT_VALUES,
        description: 'Deterministic summary sort field.',
      }),
      ApiQuery({
        name: 'order',
        required: false,
        enum: ['asc', 'desc'],
        description: 'Sort direction.',
      }),
    ],
    errors: commonErrors,
  });

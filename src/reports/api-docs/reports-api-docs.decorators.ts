import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApplicationStatus,
  ProgramBTeamApplicationStatus,
  ProgramType,
} from '../../../generated/prisma/enums';
import { createPaginationQueryDecorators } from '../../common/pagination';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { APPLICATIONS_REPORT_SORT_VALUES } from '../dto/applications-report-query.dto';
import { ApplicationsReportResponseDto } from '../dto/applications-report-response.dto';
import { ExportJobStatusDto } from '../dto/export-job-status.dto';
import { PROGRAM_B_REPORT_SORT_VALUES } from '../dto/program-b-report-query.dto';
import { ProgramBReportResponseDto } from '../dto/program-b-report-response.dto';
import { ReportExportAcceptedDto } from '../dto/report-export-accepted.dto';
import { ReportExportQueryDto } from '../dto/report-export-query.dto';
import { ReportsDashboardDto } from '../dto/reports-dashboard.dto';
import {
  REPORT_DATASET_VALUES,
  REPORT_FORMAT_VALUES,
} from '../reports.constants';

export const GetReportsDashboardApi = () =>
  createApiDecorator({
    summary: 'Get reports dashboard KPIs',
    description:
      'Returns the minimal administrative reporting dashboard required by the NTI spec: grouped application counts, grouped organization counts, active Program B project count, currently open calls, and application decisions made within the last 30 days.',
    successResponse: {
      status: 200,
      type: ReportsDashboardDto,
      description: 'Administrative reporting KPI snapshot.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only ADMIN and SUPER_ADMIN can access reports.',
      }),
    ],
  });

export const GetApplicationsReportApi = () =>
  createApiDecorator({
    summary: 'List applications report rows',
    description:
      'Returns the Program A and Program B application reporting dataset as a paginated, filterable, and sortable admin-only list. Date filters apply to the application createdAt field.',
    successResponse: {
      status: 200,
      type: ApplicationsReportResponseDto,
      description: 'Paginated applications reporting dataset.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ...createPaginationQueryDecorators({
        sortValues: APPLICATIONS_REPORT_SORT_VALUES,
        sortDescription:
          'Sortable applications report fields. Date filters apply to createdAt.',
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
      }),
      ApiQuery({
        name: 'dateFrom',
        required: false,
        type: String,
        format: 'date-time',
        description:
          'Inclusive lower bound for Application.createdAt filtering.',
      }),
      ApiQuery({
        name: 'dateTo',
        required: false,
        type: String,
        format: 'date-time',
        description:
          'Inclusive upper bound for Application.createdAt filtering.',
      }),
      ApiQuery({
        name: 'programType',
        required: false,
        enum: ProgramType,
        description: 'Filter by application call program type.',
      }),
      ApiQuery({
        name: 'status',
        required: false,
        enum: ApplicationStatus,
        description: 'Filter by application lifecycle status.',
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
        description: 'Only ADMIN and SUPER_ADMIN can access reports.',
      }),
    ],
  });

export const GetProgramBReportApi = () =>
  createApiDecorator({
    summary: 'List Program B report rows',
    description:
      'Returns the Program B team application reporting dataset as a paginated, filterable, and sortable admin-only list. Date filters apply to ProgramBTeamApplication.createdAt.',
    successResponse: {
      status: 200,
      type: ProgramBReportResponseDto,
      description: 'Paginated Program B reporting dataset.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ...createPaginationQueryDecorators({
        sortValues: PROGRAM_B_REPORT_SORT_VALUES,
        sortDescription:
          'Sortable Program B report fields. Date filters apply to createdAt.',
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
      }),
      ApiQuery({
        name: 'dateFrom',
        required: false,
        type: String,
        format: 'date-time',
        description:
          'Inclusive lower bound for ProgramBTeamApplication.createdAt filtering.',
      }),
      ApiQuery({
        name: 'dateTo',
        required: false,
        type: String,
        format: 'date-time',
        description:
          'Inclusive upper bound for ProgramBTeamApplication.createdAt filtering.',
      }),
      ApiQuery({
        name: 'status',
        required: false,
        enum: ProgramBTeamApplicationStatus,
        description: 'Filter by Program B team application status.',
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
        description: 'Only ADMIN and SUPER_ADMIN can access reports.',
      }),
    ],
  });

export const ExportReportApi = () =>
  createApiDecorator({
    summary: 'Export report dataset',
    description: [
      'Exports either the applications dataset or the Program B dataset in CSV, XLSX, or PDF format.',
      '',
      'Behavior:',
      '- Small result sets are returned synchronously as a raw file response.',
      '- Large result sets return HTTP 202 with exportJobId and continue through the async export path.',
      '',
      'Query rules:',
      '- dataset=applications uses the applications report filter set.',
      '- dataset=program-b uses the Program B report filter set.',
      '- status is dataset-specific and must match the selected dataset.',
      '- sort and order follow the selected dataset rules but pagination params are intentionally not supported.',
      '- programType is meaningful only for applications exports. For Program B exports, PROGRAM_A is rejected.',
    ].join('\n'),
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiProduces(
        'text/csv',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
      ApiQuery({
        name: 'dataset',
        required: true,
        enum: REPORT_DATASET_VALUES,
        description: 'Report dataset to export.',
      }),
      ApiQuery({
        name: 'format',
        required: true,
        enum: REPORT_FORMAT_VALUES,
        description: 'Export file format.',
      }),
      ApiQuery({
        name: 'dateFrom',
        required: false,
        type: String,
        format: 'date-time',
        description: 'Optional inclusive lower date filter.',
      }),
      ApiQuery({
        name: 'dateTo',
        required: false,
        type: String,
        format: 'date-time',
        description: 'Optional inclusive upper date filter.',
      }),
      ApiQuery({
        name: 'programType',
        required: false,
        enum: ProgramType,
        description: 'Applications export only. Filters by call program type.',
      }),
      ApiQuery({
        name: 'status',
        required: false,
        schema: {
          type: 'string',
          enum: [
            ...Object.values(ApplicationStatus),
            ...Object.values(ProgramBTeamApplicationStatus),
          ],
        },
        description:
          'Dataset-specific status filter. Use ApplicationStatus for applications or ProgramBTeamApplicationStatus for program-b.',
      }),
      ApiQuery({
        name: 'sort',
        required: false,
        enum: ReportExportQueryDto.SORT_VALUES,
        description: 'Dataset-specific export sort field.',
      }),
      ApiQuery({
        name: 'order',
        required: false,
        enum: ['asc', 'desc'],
        description: 'Export sort direction.',
      }),
      ApiOkResponse({
        description:
          'Small export completed synchronously and returned as an attachment. Swagger UI will not preview the binary body.',
        content: {
          'text/csv': {
            schema: { type: 'string', format: 'binary' },
          },
          'application/pdf': {
            schema: { type: 'string', format: 'binary' },
          },
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
            schema: { type: 'string', format: 'binary' },
          },
        },
      }),
      ApiAcceptedResponse({
        type: ReportExportAcceptedDto,
        description:
          'Large export accepted for asynchronous processing. Poll the export job endpoint for completion and download details.',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Query parameters are invalid for the selected dataset.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only ADMIN and SUPER_ADMIN can access reports.',
      }),
    ],
  });

export const GetExportJobStatusApi = () =>
  createApiDecorator({
    summary: 'Get export job status',
    description:
      'Returns the status of an asynchronous export job. Completed jobs include a short-lived downloadUrl and downloadUrlExpiresAt.',
    successResponse: {
      status: 200,
      type: ExportJobStatusDto,
      description: 'Current async export job status.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        type: String,
        format: 'uuid',
        description: 'Asynchronous export job identifier.',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Export job id must be a valid UUID.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only ADMIN and SUPER_ADMIN can access reports.',
      }),
      ApiNotFoundResponse({
        description: 'Export job was not found for the authenticated admin.',
      }),
    ],
  });

export const DownloadExportJobApi = () =>
  createApiDecorator({
    summary: 'Download completed async export',
    description: [
      'Redirects to a short-lived presigned storage URL for the file produced by a completed asynchronous export job.',
      '',
      'Requirements:',
      '- job must belong to the authenticated admin',
      '- job must be COMPLETED',
      '- token query parameter must match the current short-lived download token',
    ].join('\n'),
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        type: String,
        format: 'uuid',
        description: 'Completed asynchronous export job identifier.',
      }),
      ApiQuery({
        name: 'token',
        required: true,
        type: String,
        description:
          'Short-lived download token returned by export job status.',
      }),
      ApiResponse({
        status: 302,
        description:
          'Redirects to the presigned storage download URL in the Location header.',
        headers: {
          Location: {
            description:
              'Short-lived presigned storage URL for the export file.',
            schema: {
              type: 'string',
              format: 'uri',
            },
          },
        },
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Parameters are invalid.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Download token is invalid or expired.',
      }),
      ApiNotFoundResponse({
        description:
          'Export job was not found or the export file is not available.',
      }),
    ],
  });

export const ExportAuditPdfApi = () =>
  createApiDecorator({
    summary: 'Export report export audit PDF',
    description: [
      'Exports a human-readable PDF containing persisted report export audit events. This endpoint is intentionally PDF-only and does not expose generic audit history APIs.',
      '',
      'Requirements:',
      '- dateFrom is required',
      '- dateTo is required',
      '- dateTo must not be earlier than dateFrom',
      '- requested date range must not exceed 31 days',
    ].join('\n'),
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiProduces('application/pdf'),
      ApiQuery({
        name: 'dateFrom',
        required: true,
        type: String,
        format: 'date-time',
        description:
          'Required inclusive lower bound for audit event createdAt.',
      }),
      ApiQuery({
        name: 'dateTo',
        required: true,
        type: String,
        format: 'date-time',
        description:
          'Required inclusive upper bound for audit event createdAt. The total requested window must not exceed 31 days.',
      }),
      ApiOkResponse({
        description:
          'Audit export PDF returned as an attachment. Swagger UI will not preview the binary body.',
        content: {
          'application/pdf': {
            schema: { type: 'string', format: 'binary' },
          },
        },
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Query parameters are invalid, missing, or exceed the maximum 31-day date range.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only ADMIN and SUPER_ADMIN can access reports.',
      }),
    ],
  });

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type Prisma } from '../../../generated/prisma/client';
import {
  ApplicationStatus,
  ProgramBTeamApplicationStatus,
  ProgramType,
} from '../../../generated/prisma/enums';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import {
  buildPaginationMeta,
  resolvePagination,
  resolveSortOrder,
} from '../../common/pagination';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import {
  QueueService,
  REPORT_EXPORT_JOBS,
  type ReportExportQueuedQuery,
} from '../../infrastructure/queue';
import { ApplicationsReportResponseDto } from '../dto/applications-report-response.dto';
import { ApplicationsReportQueryDto } from '../dto/applications-report-query.dto';
import { AuditExportQueryDto } from '../dto/audit-export-query.dto';
import { ExportJobStatusDto } from '../dto/export-job-status.dto';
import { ProgramBReportQueryDto } from '../dto/program-b-report-query.dto';
import { ProgramBReportResponseDto } from '../dto/program-b-report-response.dto';
import { ReportExportAcceptedDto } from '../dto/report-export-accepted.dto';
import { ReportExportQueryDto } from '../dto/report-export-query.dto';
import { ReportsDashboardDto } from '../dto/reports-dashboard.dto';
import { ReportsRepository } from '../repositories/reports.repository';
import { AuditService } from './audit.service';
import {
  ReportFileRendererService,
  type ReportFilePayload,
} from './report-file-renderer.service';
import { ReportExportJobsService } from './report-export-jobs.service';
import {
  REPORT_EXPORT_ACTION,
  REPORT_EXPORT_ENTITY_TYPE,
  REPORT_EXPORT_SYNC_THRESHOLD,
} from '../reports.constants';

type ExportJobDownloadPayload = {
  downloadUrl: string;
};

type ApplicationsExportRow = {
  id: string;
  programType: string;
  callTitle: string;
  teamName: string;
  createdByEmail: string;
  status: string;
  submittedAt: string;
  decidedAt: string;
  createdAt: string;
  updatedAt: string;
};

type ProgramBExportRow = {
  id: string;
  organizationName: string;
  backlogTitle: string;
  teamName: string;
  createdByEmail: string;
  status: string;
  submittedAt: string;
  shortlistedAt: string;
  acceptedAt: string;
  rejectedAt: string;
  withdrawnAt: string;
  createdAt: string;
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly auditExportMaxWindowDays = 31;

  private readonly applicationsColumns = [
    ['id', 'ID'],
    ['programType', 'Program Type'],
    ['callTitle', 'Call Title'],
    ['teamName', 'Team Name'],
    ['createdByEmail', 'Created By Email'],
    ['status', 'Status'],
    ['submittedAt', 'Submitted At'],
    ['decidedAt', 'Decided At'],
    ['createdAt', 'Created At'],
    ['updatedAt', 'Updated At'],
  ] as const;

  private readonly programBColumns = [
    ['id', 'ID'],
    ['organizationName', 'Organization Name'],
    ['backlogTitle', 'Backlog Title'],
    ['teamName', 'Team Name'],
    ['createdByEmail', 'Created By Email'],
    ['status', 'Status'],
    ['submittedAt', 'Submitted At'],
    ['shortlistedAt', 'Shortlisted At'],
    ['acceptedAt', 'Accepted At'],
    ['rejectedAt', 'Rejected At'],
    ['withdrawnAt', 'Withdrawn At'],
    ['createdAt', 'Created At'],
  ] as const;

  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly auditService: AuditService,
    private readonly reportFileRenderer: ReportFileRendererService,
    private readonly exportJobsService: ReportExportJobsService,
    private readonly queueService: QueueService,
  ) {}

  getDashboard(actor: AuthenticatedUserContext): Promise<ReportsDashboardDto> {
    ensureAdminRole(actor.role);
    return this.reportsRepository.getDashboard();
  }

  async getApplicationsReport(
    actor: AuthenticatedUserContext,
    query: ApplicationsReportQueryDto,
  ): Promise<ApplicationsReportResponseDto> {
    ensureAdminRole(actor.role);

    const where = this.buildApplicationsWhere(query);
    const pagination = resolvePagination(query);
    const orderBy: Prisma.ApplicationOrderByWithRelationInput[] = [
      { [query.sort]: resolveSortOrder(query.order) },
      { id: 'asc' },
    ];

    const [rows, total] = await Promise.all([
      this.reportsRepository.findApplications({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.reportsRepository.countApplications(where),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        programType: row.call.type,
        callTitle: row.call.title,
        teamName: row.team.name,
        createdByEmail: row.createdBy.email,
        status: row.status,
        submittedAt: row.submittedAt,
        decidedAt: row.decidedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      meta: {
        ...buildPaginationMeta(total, pagination.page, pagination.limit),
        sort: query.sort,
        order: query.order,
      },
    };
  }

  async getProgramBReport(
    actor: AuthenticatedUserContext,
    query: ProgramBReportQueryDto,
  ): Promise<ProgramBReportResponseDto> {
    ensureAdminRole(actor.role);

    const where = this.buildProgramBWhere(query);
    const pagination = resolvePagination(query);
    const orderBy: Prisma.ProgramBTeamApplicationOrderByWithRelationInput[] = [
      { [query.sort]: resolveSortOrder(query.order) },
      { id: 'asc' },
    ];

    const [rows, total] = await Promise.all([
      this.reportsRepository.findProgramBApplications({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.reportsRepository.countProgramBApplications(where),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        organizationName: row.backlogItem.organization.name,
        backlogTitle: row.backlogItem.title ?? '',
        teamName: row.team.name,
        createdByEmail: row.createdBy.email,
        status: row.status,
        submittedAt: row.submittedAt,
        shortlistedAt: row.shortlistedAt,
        acceptedAt: row.acceptedAt,
        rejectedAt: row.rejectedAt,
        withdrawnAt: row.withdrawnAt,
        createdAt: row.createdAt,
      })),
      meta: {
        ...buildPaginationMeta(total, pagination.page, pagination.limit),
        sort: query.sort,
        order: query.order,
      },
    };
  }

  async exportReport(
    actor: AuthenticatedUserContext,
    query: ReportExportQueryDto,
  ): Promise<ReportFilePayload | ReportExportAcceptedDto> {
    ensureAdminRole(actor.role);
    this.validateExportQuery(query);

    const filters = this.buildExportFiltersSummary(query);
    const rowCount = await this.countDatasetRows(query);

    if (rowCount > REPORT_EXPORT_SYNC_THRESHOLD) {
      const job = await this.exportJobsService.createJob(
        actor,
        query.dataset,
        query.format,
      );

      await this.auditService.recordReportExportRequested({
        actor,
        entityId: job.id,
        dataset: query.dataset,
        format: query.format,
        mode: 'async',
        rowCount,
        filters,
      });

      await this.enqueueAsyncExport(job.id, query);

      return { exportJobId: job.id };
    }

    const file = await this.buildExportFile(query);

    await this.auditService.recordReportExportRequested({
      actor,
      entityId: randomUUID(),
      dataset: query.dataset,
      format: query.format,
      mode: 'sync',
      rowCount,
      filters,
    });

    return file;
  }

  async getExportJobStatus(
    actor: AuthenticatedUserContext,
    id: string,
  ): Promise<ExportJobStatusDto> {
    ensureAdminRole(actor.role);
    return this.exportJobsService.getStatus(actor, id);
  }

  async downloadExportJob(
    actor: AuthenticatedUserContext,
    id: string,
    token: string,
  ): Promise<ExportJobDownloadPayload> {
    ensureAdminRole(actor.role);
    return this.exportJobsService.resolveDownload(actor, id, token);
  }

  async exportAuditPdf(
    actor: AuthenticatedUserContext,
    query: AuditExportQueryDto,
  ): Promise<ReportFilePayload> {
    ensureAdminRole(actor.role);
    const createdAt = this.buildRequiredAuditExportDateRange(
      query.dateFrom,
      query.dateTo,
    );
    const events = await this.auditService.listExportAuditEvents({
      createdAt,
      action: REPORT_EXPORT_ACTION,
      entityType: REPORT_EXPORT_ENTITY_TYPE,
    });

    const headers = [
      'Timestamp',
      'Actor',
      'Action',
      'Dataset',
      'Format',
      'Mode',
      'Row Count',
      'Filters Summary',
    ];
    const rows = events.map((event) => {
      const metadata = this.normalizeMetadata(event.metadata);

      return [
        event.createdAt.toISOString(),
        event.actorUser.email,
        event.action,
        this.toDisplayString(metadata.dataset),
        this.toDisplayString(metadata.format),
        this.toDisplayString(metadata.mode),
        this.toDisplayString(metadata.rowCount),
        this.summarizeFilters(metadata.filters),
      ];
    });

    const buffer = await this.reportFileRenderer.renderPdfBuffer(
      'Report Export Audit',
      headers,
      rows,
    );

    return {
      buffer,
      contentType: 'application/pdf',
      fileName: this.buildFileName('report-export-audit', 'pdf'),
    };
  }

  async executeAsyncExportJob(
    jobId: string,
    query: ReportExportQueryDto,
  ): Promise<void> {
    this.validateExportQuery(query);
    await this.exportJobsService.markProcessing(jobId);
    const file = await this.buildExportFile(query);
    await this.exportJobsService.markCompleted(jobId, file);
  }

  failAsyncExportJob(jobId: string, errorMessage: string): Promise<void> {
    return this.exportJobsService.markFailed(jobId, errorMessage);
  }

  private async buildExportFile(
    query: ReportExportQueryDto,
  ): Promise<ReportFilePayload> {
    if (query.dataset === 'applications') {
      const rows = await this.getApplicationExportRows(query);
      return this.reportFileRenderer.renderFile(
        'applications-report',
        'Applications Report',
        this.applicationsColumns.map(([, label]) => label),
        rows.map((row) =>
          this.applicationsColumns.map(
            ([key]) => row[key as keyof ApplicationsExportRow],
          ),
        ),
        query.format,
      );
    }

    const rows = await this.getProgramBExportRows(query);
    return this.reportFileRenderer.renderFile(
      'program-b-report',
      'Program B Report',
      this.programBColumns.map(([, label]) => label),
      rows.map((row) =>
        this.programBColumns.map(
          ([key]) => row[key as keyof ProgramBExportRow],
        ),
      ),
      query.format,
    );
  }

  private async countDatasetRows(query: ReportExportQueryDto): Promise<number> {
    if (query.dataset === 'applications') {
      return this.reportsRepository.countApplications(
        this.buildApplicationsWhere(query),
      );
    }

    return this.reportsRepository.countProgramBApplications(
      this.buildProgramBWhere({
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        status: query.status,
      }),
    );
  }

  private async getApplicationExportRows(
    query: ReportExportQueryDto,
  ): Promise<ApplicationsExportRow[]> {
    const sort = query.sort ?? 'createdAt';
    const order = query.order ?? 'desc';

    const rows = await this.reportsRepository.findApplications({
      where: this.buildApplicationsWhere(query),
      orderBy: [
        {
          [this.resolveApplicationsExportSort(sort)]: resolveSortOrder(order),
        },
        { id: 'asc' },
      ],
    });

    return rows.map((row) => ({
      id: row.id,
      programType: row.call.type,
      callTitle: row.call.title,
      teamName: row.team.name,
      createdByEmail: row.createdBy.email,
      status: row.status,
      submittedAt: this.formatDate(row.submittedAt),
      decidedAt: this.formatDate(row.decidedAt),
      createdAt: this.formatDate(row.createdAt),
      updatedAt: this.formatDate(row.updatedAt),
    }));
  }

  private async getProgramBExportRows(
    query: ReportExportQueryDto,
  ): Promise<ProgramBExportRow[]> {
    const sort = query.sort ?? 'createdAt';
    const order = query.order ?? 'desc';

    const rows = await this.reportsRepository.findProgramBApplications({
      where: this.buildProgramBWhere({
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        status: query.status,
      }),
      orderBy: [
        {
          [this.resolveProgramBExportSort(sort)]: resolveSortOrder(order),
        },
        { id: 'asc' },
      ],
    });

    return rows.map((row) => ({
      id: row.id,
      organizationName: row.backlogItem.organization.name,
      backlogTitle: row.backlogItem.title ?? '',
      teamName: row.team.name,
      createdByEmail: row.createdBy.email,
      status: row.status,
      submittedAt: this.formatDate(row.submittedAt),
      shortlistedAt: this.formatDate(row.shortlistedAt),
      acceptedAt: this.formatDate(row.acceptedAt),
      rejectedAt: this.formatDate(row.rejectedAt),
      withdrawnAt: this.formatDate(row.withdrawnAt),
      createdAt: this.formatDate(row.createdAt),
    }));
  }

  private buildApplicationsWhere(
    query: Pick<
      ApplicationsReportQueryDto | ReportExportQueryDto,
      'dateFrom' | 'dateTo' | 'programType' | 'status'
    >,
  ): Prisma.ApplicationWhereInput {
    return {
      ...(query.status
        ? { status: this.resolveApplicationsStatus(query.status) }
        : {}),
      ...(query.programType ? { call: { type: query.programType } } : {}),
      ...this.buildCreatedAtWhere(query.dateFrom, query.dateTo),
    };
  }

  private buildProgramBWhere(
    query: Pick<
      ProgramBReportQueryDto | ReportExportQueryDto,
      'dateFrom' | 'dateTo' | 'status'
    >,
  ): Prisma.ProgramBTeamApplicationWhereInput {
    return {
      ...(query.status
        ? { status: this.resolveProgramBStatus(query.status) }
        : {}),
      ...this.buildCreatedAtWhere(query.dateFrom, query.dateTo),
    };
  }

  private buildCreatedAtWhere(
    dateFrom?: string,
    dateTo?: string,
  ): { createdAt?: { gte?: Date; lte?: Date } } {
    const range = this.buildDateRangeFilter(dateFrom, dateTo);

    return range ? { createdAt: range } : {};
  }

  private buildRequiredAuditExportDateRange(
    dateFrom?: string,
    dateTo?: string,
  ): { gte?: Date; lte?: Date } {
    if (!dateFrom || !dateTo) {
      throw new BadRequestException(
        'dateFrom and dateTo are required for audit export',
      );
    }

    const range = this.buildDateRangeFilter(dateFrom, dateTo);

    if (!range?.gte || !range.lte) {
      throw new BadRequestException(
        'dateFrom and dateTo are required for audit export',
      );
    }

    const windowMs = range.lte.getTime() - range.gte.getTime();
    const maxWindowMs = this.auditExportMaxWindowDays * 24 * 60 * 60 * 1000;

    if (windowMs > maxWindowMs) {
      throw new BadRequestException(
        `audit export date range must not exceed ${this.auditExportMaxWindowDays} days`,
      );
    }

    return range;
  }

  private buildDateRangeFilter(
    dateFrom?: string,
    dateTo?: string,
  ): { gte?: Date; lte?: Date } | undefined {
    if (!dateFrom && !dateTo) {
      return undefined;
    }

    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    if (from && Number.isNaN(from.getTime())) {
      throw new BadRequestException('dateFrom must be a valid ISO datetime');
    }

    if (to && Number.isNaN(to.getTime())) {
      throw new BadRequestException('dateTo must be a valid ISO datetime');
    }

    if (from && to && from > to) {
      throw new BadRequestException('dateFrom must be before dateTo');
    }

    return {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  private buildExportFiltersSummary(
    query: ReportExportQueryDto,
  ): Record<string, unknown> {
    return {
      dataset: query.dataset,
      format: query.format,
      ...(query.dateFrom ? { dateFrom: query.dateFrom } : {}),
      ...(query.dateTo ? { dateTo: query.dateTo } : {}),
      ...(query.programType ? { programType: query.programType } : {}),
      ...(query.status ? { status: query.status } : {}),
      sort: query.sort,
      order: query.order,
    };
  }

  private validateExportQuery(query: ReportExportQueryDto): void {
    this.assertSupportedExportQuery(query);

    const sort = query.sort ?? 'createdAt';

    if (query.dataset === 'applications') {
      this.resolveApplicationsExportSort(sort);
      if (query.status) {
        this.resolveApplicationsStatus(query.status);
      }
      return;
    }

    this.resolveProgramBExportSort(sort);
    if (query.status) {
      this.resolveProgramBStatus(query.status);
    }
  }

  private assertSupportedExportQuery(query: ReportExportQueryDto): void {
    if (
      query.dataset === 'program-b' &&
      query.programType &&
      query.programType !== ProgramType.PROGRAM_B
    ) {
      throw new BadRequestException(
        'programType=PROGRAM_A is not supported for program-b exports',
      );
    }
  }

  private async enqueueAsyncExport(
    exportJobId: string,
    query: ReportExportQueryDto,
  ): Promise<void> {
    try {
      await this.queueService.addReportExport(
        REPORT_EXPORT_JOBS.GENERATE,
        {
          exportJobId,
          query: this.toQueuedExportQuery(query),
        },
        {
          jobId: exportJobId,
        },
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to enqueue export job';

      this.logger.error(
        `Failed to enqueue export job "${exportJobId}": ${message}`,
      );
      await this.exportJobsService.markFailed(exportJobId, message);
      throw new InternalServerErrorException('Failed to schedule export job');
    }
  }

  private toQueuedExportQuery(
    query: ReportExportQueryDto,
  ): ReportExportQueuedQuery {
    return {
      dataset: query.dataset,
      format: query.format,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      programType: query.programType,
      status: query.status,
      sort: query.sort,
      order: query.order,
    };
  }

  private resolveApplicationsStatus(status: string): ApplicationStatus {
    if (
      !Object.values(ApplicationStatus).includes(status as ApplicationStatus)
    ) {
      throw new BadRequestException(
        'status must be a valid ApplicationStatus for applications exports',
      );
    }

    return status as ApplicationStatus;
  }

  private resolveProgramBStatus(status: string): ProgramBTeamApplicationStatus {
    if (
      !Object.values(ProgramBTeamApplicationStatus).includes(
        status as ProgramBTeamApplicationStatus,
      )
    ) {
      throw new BadRequestException(
        'status must be a valid ProgramBTeamApplicationStatus for program-b exports',
      );
    }

    return status as ProgramBTeamApplicationStatus;
  }

  private resolveApplicationsExportSort(
    sort: string,
  ): ApplicationsReportQueryDto['sort'] {
    const allowed = [
      'createdAt',
      'submittedAt',
      'decidedAt',
      'status',
    ] as const;

    if (!allowed.includes(sort as (typeof allowed)[number])) {
      throw new BadRequestException(
        'sort must be one of createdAt, submittedAt, decidedAt, status for applications exports',
      );
    }

    return sort as ApplicationsReportQueryDto['sort'];
  }

  private resolveProgramBExportSort(
    sort: string,
  ): ProgramBReportQueryDto['sort'] {
    const allowed = ['createdAt', 'submittedAt', 'status'] as const;

    if (!allowed.includes(sort as (typeof allowed)[number])) {
      throw new BadRequestException(
        'sort must be one of createdAt, submittedAt, status for program-b exports',
      );
    }

    return sort as ProgramBReportQueryDto['sort'];
  }

  private normalizeMetadata(metadata: unknown): Record<string, unknown> {
    return metadata && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>)
      : {};
  }

  private summarizeFilters(filters: unknown): string {
    if (!filters || typeof filters !== 'object') {
      return '-';
    }

    const entries = Object.entries(filters as Record<string, unknown>);

    if (entries.length === 0) {
      return '-';
    }

    return entries
      .map(([key, value]) => `${key}=${this.toDisplayString(value)}`)
      .join(', ');
  }

  private toDisplayString(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return JSON.stringify(value);
  }

  private formatDate(value: Date | null): string {
    return value ? value.toISOString() : '';
  }

  private buildFileName(base: string, extension: string): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${base}-${stamp}.${extension}`;
  }
}

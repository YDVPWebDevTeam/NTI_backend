import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { UserRole } from '../../generated/prisma/enums';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  DownloadExportJobApi,
  ExportAuditPdfApi,
  ExportReportApi,
  GetApplicationsReportApi,
  GetExportJobStatusApi,
  GetProgramBReportApi,
  GetReportsDashboardApi,
} from './api-docs';
import { ApplicationsReportQueryDto } from './dto/applications-report-query.dto';
import { AuditExportQueryDto } from './dto/audit-export-query.dto';
import { ProgramBReportQueryDto } from './dto/program-b-report-query.dto';
import { ReportExportAcceptedDto } from './dto/report-export-accepted.dto';
import { ReportExportQueryDto } from './dto/report-export-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @GetReportsDashboardApi()
  @Get('dashboard')
  getDashboard(@GetUserContext() actor: AuthenticatedUserContext) {
    return this.reportsService.getDashboard(actor);
  }

  @GetApplicationsReportApi()
  @Get('applications')
  getApplications(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Query() query: ApplicationsReportQueryDto,
  ) {
    return this.reportsService.getApplicationsReport(actor, query);
  }

  @GetProgramBReportApi()
  @Get('program-b')
  getProgramB(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Query() query: ProgramBReportQueryDto,
  ) {
    return this.reportsService.getProgramBReport(actor, query);
  }

  @ExportReportApi()
  @Get('export')
  async exportReport(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Query() query: ReportExportQueryDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.reportsService.exportReport(actor, query);

    if ('exportJobId' in result) {
      reply.status(202).send(result satisfies ReportExportAcceptedDto);
      return;
    }

    this.sendFile(reply, result);
  }

  @GetExportJobStatusApi()
  @Get('export-jobs/:id')
  getExportJobStatus(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportsService.getExportJobStatus(actor, id);
  }

  @DownloadExportJobApi()
  @Get('export-jobs/:id/download')
  downloadExportJob(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string,
    @Res() reply: FastifyReply,
  ): void {
    const result = this.reportsService.downloadExportJob(actor, id, token);
    this.sendFile(reply, result);
  }

  @ExportAuditPdfApi()
  @Get('audit-export')
  async exportAuditPdf(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Query() query: AuditExportQueryDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const result = await this.reportsService.exportAuditPdf(actor, query);
    this.sendFile(reply, result);
  }

  private sendFile(
    reply: FastifyReply,
    file: { buffer: Buffer; contentType: string; fileName: string },
  ): void {
    reply
      .header('Content-Type', file.contentType)
      .header('Content-Disposition', `attachment; filename="${file.fileName}"`)
      .send(file.buffer);
  }
}

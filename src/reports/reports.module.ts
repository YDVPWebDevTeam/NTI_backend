import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { PdfModule } from '../infrastructure/pdf';
import { QueueModule } from '../infrastructure/queue';
import { AuditRepository } from './audit/audit.repository';
import { AuditService } from './audit/audit.service';
import { ReportExportJobsRepository } from './report-export/report-export-jobs.repository';
import { ReportExportJobsService } from './report-export/report-export-jobs.service';
import { ReportExportProcessor } from './report-export/report-export.processor';
import { ReportFileRendererService } from './report-export/report-file-renderer.service';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

@Module({
  imports: [AuthModule, FilesModule, PdfModule, QueueModule],
  controllers: [ReportsController],
  providers: [
    AuditRepository,
    AuditService,
    ReportExportJobsRepository,
    ReportsRepository,
    ReportFileRendererService,
    ReportsService,
    ReportExportJobsService,
    ReportExportProcessor,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}

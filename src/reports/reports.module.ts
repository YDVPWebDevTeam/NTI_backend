import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { PdfModule } from '../infrastructure/pdf';
import { QueueModule } from '../infrastructure/queue';
import { ReportsController } from './controllers/reports.controller';
import { AuditRepository } from './repositories/audit.repository';
import { ReportExportJobsRepository } from './repositories/report-export-jobs.repository';
import { ReportsRepository } from './repositories/reports.repository';
import { AuditService } from './services/audit.service';
import { ReportFileRendererService } from './services/report-file-renderer.service';
import { ReportExportJobsService } from './services/report-export-jobs.service';
import { ReportsService } from './services/reports.service';

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
  ],
  exports: [ReportsService],
})
export class ReportsModule {}

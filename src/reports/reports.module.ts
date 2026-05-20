import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PdfModule } from '../infrastructure/pdf';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';
import { ReportExportJobsService } from './report-export-jobs.service';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

@Module({
  imports: [AuthModule, PdfModule],
  controllers: [ReportsController],
  providers: [
    AuditRepository,
    AuditService,
    ReportsRepository,
    ReportsService,
    ReportExportJobsService,
  ],
})
export class ReportsModule {}

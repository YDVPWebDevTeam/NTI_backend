import { ReportExportJobsService } from './report-export-jobs.service';
import { ForbiddenException } from '@nestjs/common';

describe('ReportExportJobsService', () => {
  let service: ReportExportJobsService;

  beforeEach(() => {
    service = new ReportExportJobsService({
      fileDownloadPresignExpiresSeconds: 300,
    } as never);
  });

  it('returns downloadable status for completed jobs', () => {
    const actor = { id: 'admin-1', role: 'ADMIN' } as never;
    const job = service.createJob(actor, 'applications', 'csv');

    service.markCompleted(job.id, {
      buffer: Buffer.from('csv'),
      fileName: 'report.csv',
      contentType: 'text/csv',
    });

    const status = service.getStatus(actor, job.id);

    expect(status.status).toBe('COMPLETED');
    expect(status.downloadUrl).toContain(
      `/api/v1/reports/export-jobs/${job.id}/download?token=`,
    );
    expect(status.downloadUrlExpiresAt).toBeDefined();
  });

  it('rejects expired download tokens', () => {
    jest.useFakeTimers();

    const actor = { id: 'admin-1', role: 'ADMIN' } as never;
    const job = service.createJob(actor, 'applications', 'csv');

    service.markCompleted(job.id, {
      buffer: Buffer.from('csv'),
      fileName: 'report.csv',
      contentType: 'text/csv',
    });

    const status = service.getStatus(actor, job.id);
    const token = status.downloadUrl?.split('token=')[1] ?? '';

    jest.advanceTimersByTime(301_000);

    expect(() => service.resolveDownload(actor, job.id, token)).toThrow(
      ForbiddenException,
    );

    jest.useRealTimers();
  });
});

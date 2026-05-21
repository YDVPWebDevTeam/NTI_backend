import { ReportsController } from './reports.controller';
import { ReportsService } from '../services/reports.service';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: {
    getDashboard: jest.Mock;
    getApplicationsReport: jest.Mock;
    getProgramBReport: jest.Mock;
    exportReport: jest.Mock;
    getExportJobStatus: jest.Mock;
    downloadExportJob: jest.Mock;
    exportAuditPdf: jest.Mock;
  };

  beforeEach(() => {
    reportsService = {
      getDashboard: jest.fn().mockResolvedValue({}),
      getApplicationsReport: jest.fn().mockResolvedValue({}),
      getProgramBReport: jest.fn().mockResolvedValue({}),
      exportReport: jest.fn(),
      getExportJobStatus: jest.fn().mockReturnValue({ id: 'job-1' }),
      downloadExportJob: jest.fn().mockResolvedValue({
        downloadUrl: 'https://r2.example.com/report.csv',
      }),
      exportAuditPdf: jest.fn().mockResolvedValue({
        buffer: Buffer.from('pdf'),
        contentType: 'application/pdf',
        fileName: 'audit.pdf',
      }),
    };

    controller = new ReportsController(
      reportsService as never as ReportsService,
    );
  });

  it('returns 202 payload for async exports', async () => {
    const reply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    reportsService.exportReport.mockResolvedValue({ exportJobId: 'job-1' });

    await controller.exportReport(
      { id: 'admin-1', role: 'ADMIN' } as never,
      {} as never,
      reply as never,
    );

    expect(reply.status).toHaveBeenCalledWith(202);
    expect(reply.send).toHaveBeenCalledWith({ exportJobId: 'job-1' });
  });

  it('redirects async export downloads to storage', async () => {
    const reply = {
      redirect: jest.fn(),
    };

    await controller.downloadExportJob(
      { id: 'admin-1', role: 'ADMIN' } as never,
      'job-1',
      'token-1',
      reply as never,
    );

    expect(reportsService.downloadExportJob).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'admin-1' }),
      'job-1',
      'token-1',
    );
    expect(reply.redirect).toHaveBeenCalledWith(
      'https://r2.example.com/report.csv',
    );
  });
});

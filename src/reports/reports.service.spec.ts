import { ReportsService } from './reports.service';
import { BadRequestException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;
  let reportsRepository: {
    countApplications: jest.Mock;
    findApplications: jest.Mock;
    countProgramBApplications: jest.Mock;
    findProgramBApplications: jest.Mock;
  };
  let auditService: {
    recordReportExportRequested: jest.Mock;
    listExportAuditEvents: jest.Mock;
  };
  let pdfService: {
    generateFromHtml: jest.Mock;
  };
  let exportJobsService: {
    createJob: jest.Mock;
    markProcessing: jest.Mock;
    markCompleted: jest.Mock;
    markFailed: jest.Mock;
  };

  beforeEach(() => {
    reportsRepository = {
      countApplications: jest.fn(),
      findApplications: jest.fn(),
      countProgramBApplications: jest.fn(),
      findProgramBApplications: jest.fn(),
    };
    auditService = {
      recordReportExportRequested: jest.fn().mockResolvedValue('entity-1'),
      listExportAuditEvents: jest.fn(),
    };
    pdfService = {
      generateFromHtml: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };
    exportJobsService = {
      createJob: jest.fn().mockReturnValue({ id: 'job-1' }),
      markProcessing: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    };

    service = new ReportsService(
      reportsRepository as never,
      auditService as never,
      pdfService as never,
      exportJobsService as never,
    );
  });

  it('returns a sync export for small application datasets and writes audit event', async () => {
    reportsRepository.countApplications.mockResolvedValue(1);
    reportsRepository.findApplications.mockResolvedValue([
      {
        id: 'app-1',
        status: 'SUBMITTED',
        submittedAt: new Date('2026-05-01T10:00:00.000Z'),
        decidedAt: null,
        createdAt: new Date('2026-05-01T09:00:00.000Z'),
        updatedAt: new Date('2026-05-01T11:00:00.000Z'),
        call: { type: 'PROGRAM_A', title: 'Spring 2026' },
        team: { name: 'Alpha' },
        createdBy: { email: 'lead@example.com' },
      },
    ]);

    const result = await service.exportReport(
      { id: 'admin-1', role: 'ADMIN' } as never,
      {
        dataset: 'applications',
        format: 'csv',
      } as never,
    );

    expect('buffer' in result).toBe(true);
    expect(auditService.recordReportExportRequested).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'sync',
        rowCount: 1,
      }),
    );
  });

  it('returns async export job for large datasets and writes audit event', async () => {
    reportsRepository.countApplications.mockResolvedValue(501);
    reportsRepository.findApplications.mockResolvedValue([]);

    const result = await service.exportReport(
      { id: 'admin-1', role: 'ADMIN' } as never,
      {
        dataset: 'applications',
        format: 'csv',
      } as never,
    );

    expect(result).toEqual({ exportJobId: 'job-1' });
    expect(exportJobsService.createJob).toHaveBeenCalled();
    expect(auditService.recordReportExportRequested).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'async',
        rowCount: 501,
      }),
    );
  });

  it('rejects invalid dataset-specific status for program-b exports', async () => {
    await expect(
      service.exportReport(
        { id: 'admin-1', role: 'ADMIN' } as never,
        {
          dataset: 'program-b',
          format: 'csv',
          status: 'APPROVED',
        } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid dataset-specific sort for program-b exports', async () => {
    await expect(
      service.exportReport(
        { id: 'admin-1', role: 'ADMIN' } as never,
        {
          dataset: 'program-b',
          format: 'csv',
          sort: 'decidedAt',
        } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses shared status plus sort/order for program-b export', async () => {
    reportsRepository.countProgramBApplications.mockResolvedValue(1);
    reportsRepository.findProgramBApplications.mockResolvedValue([
      {
        id: 'pb-1',
        status: 'SHORTLISTED',
        submittedAt: new Date('2026-05-01T10:00:00.000Z'),
        shortlistedAt: new Date('2026-05-02T10:00:00.000Z'),
        acceptedAt: null,
        rejectedAt: null,
        withdrawnAt: null,
        createdAt: new Date('2026-05-01T09:00:00.000Z'),
        backlogItem: {
          title: 'Backlog item',
          organization: { name: 'Org A' },
        },
        team: { name: 'Alpha' },
        createdBy: { email: 'lead@example.com' },
      },
    ]);

    await service.exportReport(
      { id: 'admin-1', role: 'ADMIN' } as never,
      {
        dataset: 'program-b',
        format: 'csv',
        status: 'SHORTLISTED',
        sort: 'submittedAt',
        order: 'asc',
      } as never,
    );

    expect(reportsRepository.countProgramBApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SHORTLISTED',
      }),
    );
    expect(reportsRepository.findProgramBApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'SHORTLISTED',
        },
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });
});

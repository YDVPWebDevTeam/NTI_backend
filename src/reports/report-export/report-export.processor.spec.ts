import { REPORT_EXPORT_JOBS } from '../../infrastructure/queue';
import { ReportExportProcessor } from './report-export.processor';

describe('ReportExportProcessor', () => {
  let processor: ReportExportProcessor;
  let reportsService: {
    executeAsyncExportJob: jest.Mock;
    failAsyncExportJob: jest.Mock;
  };

  beforeEach(() => {
    reportsService = {
      executeAsyncExportJob: jest.fn().mockResolvedValue(undefined),
      failAsyncExportJob: jest.fn().mockResolvedValue(undefined),
    };

    processor = new ReportExportProcessor(reportsService as never);
  });

  it('delegates queued export generation to ReportsService', async () => {
    const result = await processor.process({
      id: 'job-1',
      name: REPORT_EXPORT_JOBS.GENERATE,
      data: {
        exportJobId: 'export-job-1',
        query: {
          dataset: 'applications',
          format: 'csv',
        },
      },
    } as never);

    expect(reportsService.executeAsyncExportJob).toHaveBeenCalledWith(
      'export-job-1',
      expect.objectContaining({
        dataset: 'applications',
        format: 'csv',
      }),
    );
    expect(result).toEqual({ exportJobId: 'export-job-1' });
  });

  it('marks the export job as failed when background generation throws', async () => {
    reportsService.executeAsyncExportJob.mockRejectedValue(
      new Error('render failed'),
    );

    await expect(
      processor.process({
        id: 'job-1',
        name: REPORT_EXPORT_JOBS.GENERATE,
        data: {
          exportJobId: 'export-job-1',
          query: {
            dataset: 'applications',
            format: 'csv',
          },
        },
      } as never),
    ).rejects.toThrow('render failed');

    expect(reportsService.failAsyncExportJob).toHaveBeenCalledWith(
      'export-job-1',
      'render failed',
    );
  });
});

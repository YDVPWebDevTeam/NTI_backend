import { ForbiddenException } from '@nestjs/common';
import { ReportExportJobsService } from './report-export-jobs.service';

describe('ReportExportJobsService', () => {
  let service: ReportExportJobsService;
  let repository: {
    create: jest.Mock;
    update: jest.Mock;
    findSelectedById: jest.Mock;
    findSelectedByIdForOwner: jest.Mock;
  };
  let filesService: {
    createServerGeneratedFileForOwner: jest.Mock;
    requestDownloadUrl: jest.Mock;
  };
  let jobRecord: {
    id: string;
    requestedByUserId: string;
    dataset: string;
    format: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
    errorMessage: string | null;
    uploadedFileId: string | null;
    downloadTokenHash: string | null;
    downloadTokenExpiresAt: Date | null;
  };

  beforeEach(() => {
    jobRecord = {
      id: 'job-1',
      requestedByUserId: 'admin-1',
      dataset: 'applications',
      format: 'csv',
      status: 'PENDING',
      createdAt: new Date('2026-05-21T10:00:00.000Z'),
      completedAt: null,
      errorMessage: null,
      uploadedFileId: null,
      downloadTokenHash: null,
      downloadTokenExpiresAt: null,
    };

    repository = {
      create: jest.fn().mockResolvedValue({ id: 'job-1' }),
      update: jest
        .fn()
        .mockImplementation(
          (_where: { id: string }, data: Partial<typeof jobRecord>) => {
            Object.assign(jobRecord, data);
            return Promise.resolve(jobRecord);
          },
        ),
      findSelectedById: jest.fn().mockResolvedValue(jobRecord),
      findSelectedByIdForOwner: jest.fn().mockResolvedValue(jobRecord),
    };

    filesService = {
      createServerGeneratedFileForOwner: jest
        .fn()
        .mockResolvedValue({ id: 'file-1' }),
      requestDownloadUrl: jest.fn().mockResolvedValue({
        fileId: 'file-1',
        downloadUrl: 'https://r2.example.com/report.csv',
      }),
    };

    service = new ReportExportJobsService(
      {
        fileDownloadPresignExpiresSeconds: 300,
        jwtAccessSecret: '12345678901234567890123456789012',
      } as never,
      repository as never,
      filesService as never,
    );
  });

  it('returns downloadable status for completed jobs', async () => {
    jobRecord.status = 'COMPLETED';
    jobRecord.completedAt = new Date('2026-05-21T10:05:00.000Z');
    jobRecord.uploadedFileId = 'file-1';

    const status = await service.getStatus(
      { id: 'admin-1', role: 'ADMIN' } as never,
      'job-1',
    );

    expect(status.status).toBe('COMPLETED');
    expect(status.downloadUrl).toContain(
      '/api/v1/reports/export-jobs/job-1/download?token=',
    );
    expect(status.downloadUrlExpiresAt).toBeDefined();
    const updateCall = repository.update.mock.calls[0] as
      | [{ id: string }, Partial<typeof jobRecord>]
      | undefined;

    expect(updateCall?.[0]).toEqual({ id: 'job-1' });
    expect(updateCall?.[1].downloadTokenHash).toEqual(expect.any(String));
  });

  it('reuses the same download token while it is still valid', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-21T10:00:00.000Z'));

    jobRecord.status = 'COMPLETED';
    jobRecord.completedAt = new Date('2026-05-21T10:05:00.000Z');
    jobRecord.uploadedFileId = 'file-1';

    const firstStatus = await service.getStatus(
      { id: 'admin-1', role: 'ADMIN' } as never,
      'job-1',
    );
    const secondStatus = await service.getStatus(
      { id: 'admin-1', role: 'ADMIN' } as never,
      'job-1',
    );

    expect(secondStatus.downloadUrl).toBe(firstStatus.downloadUrl);
    expect(secondStatus.downloadUrlExpiresAt).toBe(
      firstStatus.downloadUrlExpiresAt,
    );
    expect(repository.update).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('rotates the download token after it expires', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-21T10:00:00.000Z'));

    jobRecord.status = 'COMPLETED';
    jobRecord.completedAt = new Date('2026-05-21T10:05:00.000Z');
    jobRecord.uploadedFileId = 'file-1';

    const firstStatus = await service.getStatus(
      { id: 'admin-1', role: 'ADMIN' } as never,
      'job-1',
    );

    jest.advanceTimersByTime(301_000);

    const secondStatus = await service.getStatus(
      { id: 'admin-1', role: 'ADMIN' } as never,
      'job-1',
    );

    expect(secondStatus.downloadUrl).not.toBe(firstStatus.downloadUrl);
    expect(secondStatus.downloadUrlExpiresAt).not.toBe(
      firstStatus.downloadUrlExpiresAt,
    );
    expect(repository.update).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('stores completed exports in files storage and resolves to download url', async () => {
    await service.markCompleted('job-1', {
      buffer: Buffer.from('csv'),
      fileName: 'report.csv',
      contentType: 'text/csv',
    });

    expect(filesService.createServerGeneratedFileForOwner).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({
        filename: 'report.csv',
        mimeType: 'text/csv',
        purpose: 'report-export',
        entityType: 'report_export_job',
        entityId: 'job-1',
      }),
    );

    const status = await service.getStatus(
      { id: 'admin-1', role: 'ADMIN' } as never,
      'job-1',
    );
    const token = status.downloadUrl?.split('token=')[1] ?? '';

    const result = await service.resolveDownload(
      { id: 'admin-1', role: 'ADMIN' } as never,
      'job-1',
      token,
    );

    expect(result).toEqual({
      downloadUrl: 'https://r2.example.com/report.csv',
    });
    expect(filesService.requestDownloadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'admin-1' }),
      'file-1',
      'attachment',
    );
  });

  it('rejects expired download tokens', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-21T10:00:00.000Z'));

    jobRecord.status = 'COMPLETED';
    jobRecord.completedAt = new Date('2026-05-21T10:05:00.000Z');
    jobRecord.uploadedFileId = 'file-1';

    const status = await service.getStatus(
      { id: 'admin-1', role: 'ADMIN' } as never,
      'job-1',
    );
    const token = status.downloadUrl?.split('token=')[1] ?? '';

    jest.advanceTimersByTime(301_000);

    await expect(
      service.resolveDownload(
        { id: 'admin-1', role: 'ADMIN' } as never,
        'job-1',
        token,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    jest.useRealTimers();
  });

  it('rejects missing download tokens before hashing', async () => {
    jobRecord.status = 'COMPLETED';
    jobRecord.completedAt = new Date('2026-05-21T10:05:00.000Z');
    jobRecord.uploadedFileId = 'file-1';

    await expect(
      service.resolveDownload(
        { id: 'admin-1', role: 'ADMIN' } as never,
        'job-1',
        undefined,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

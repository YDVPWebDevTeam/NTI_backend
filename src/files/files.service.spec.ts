jest.mock('../infrastructure/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('../infrastructure/storage', () => ({
  R2StorageService: class R2StorageService {},
}));

jest.mock('./files.repository', () => ({
  FilesRepository: class FilesRepository {},
}));

import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FilesService } from './files.service';

describe('FilesService', () => {
  let service: FilesService;
  let filesRepository: {
    create: jest.Mock;
    findRecentByOwner: jest.Mock;
    findByIdForOwner: jest.Mock;
    markFailed: jest.Mock;
    markUploaded: jest.Mock;
  };
  let configService: {
    r2PublicBaseUrl?: string;
    fileDownloadPresignExpiresSeconds: number;
    fileUploadMaxSizeBytes: number;
    fileUploadAllowedMimeTypes: string[];
    fileUploadPresignExpiresSeconds: number;
    fileUploadVerifyObjectOnComplete: boolean;
  };
  let storageService: {
    buildPublicUrl: jest.Mock;
    createPresignedDownloadUrl: jest.Mock;
    createPresignedUploadUrl: jest.Mock;
    headObjectOrThrow: jest.Mock;
    putObject: jest.Mock<
      Promise<void>,
      [{ key: string; body: Buffer; contentType: string }]
    >;
  };

  const authUser: AuthenticatedUserContext = {
    id: 'user-1',
    email: 'student@example.com',
    role: 'STUDENT',
    status: 'ACTIVE',
  };

  beforeEach(() => {
    filesRepository = {
      create: jest.fn(),
      findRecentByOwner: jest.fn(),
      findByIdForOwner: jest.fn(),
      markFailed: jest.fn().mockResolvedValue(undefined),
      markUploaded: jest.fn(),
    };

    configService = {
      r2PublicBaseUrl: 'https://cdn.example.com',
      fileDownloadPresignExpiresSeconds: 300,
      fileUploadMaxSizeBytes: 10 * 1024 * 1024,
      fileUploadAllowedMimeTypes: ['image/png', 'application/pdf'],
      fileUploadPresignExpiresSeconds: 900,
      fileUploadVerifyObjectOnComplete: false,
    };

    storageService = {
      buildPublicUrl: jest.fn(
        (key: string) => `https://cdn.example.com/${key}`,
      ),
      createPresignedDownloadUrl: jest.fn(),
      createPresignedUploadUrl: jest.fn(),
      headObjectOrThrow: jest.fn(),
      putObject: jest.fn<
        Promise<void>,
        [{ key: string; body: Buffer; contentType: string }]
      >(),
    };

    service = new FilesService(
      filesRepository as never,
      configService as never,
      storageService as never,
    );
  });

  it('creates pending file and returns upload instructions', async () => {
    filesRepository.create.mockResolvedValue({
      id: 'file-1',
    });
    storageService.createPresignedUploadUrl.mockResolvedValue(
      'https://upload.url',
    );

    const response = await service.requestUpload(authUser, {
      filename: 'avatar.png',
      mimeType: 'image/png',
      size: 2500,
      purpose: 'avatar',
    });

    expect(filesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'user-1',
        originalName: 'avatar.png',
        mimeType: 'image/png',
        size: 2500,
        purpose: 'avatar',
      }),
    );
    expect(response.fileId).toBe('file-1');
    expect(response.uploadUrl).toBe('https://upload.url');
    expect(response.key).toContain('users/user-1/avatar/');
    expect(response.visibility).toBe('PRIVATE');
  });

  it('returns a stable public url for public uploads', async () => {
    filesRepository.create.mockResolvedValue({
      id: 'file-1',
    });
    storageService.createPresignedUploadUrl.mockResolvedValue(
      'https://upload.url',
    );

    const response = await service.requestUpload(authUser, {
      filename: 'avatar.png',
      mimeType: 'image/png',
      size: 2500,
      purpose: 'avatar',
      visibility: 'PUBLIC',
    });

    expect(response.visibility).toBe('PUBLIC');
    expect(response.publicUrl).toContain(
      'https://cdn.example.com/users/user-1/avatar/',
    );
  });

  it('marks pending file as uploaded on complete', async () => {
    filesRepository.findByIdForOwner.mockResolvedValue({
      id: 'file-1',
      ownerId: 'user-1',
      key: 'users/user-1/general/2026-04-05/file.png',
      originalName: 'file.png',
      mimeType: 'image/png',
      size: 2500,
      status: 'PENDING',
      uploadedAt: null,
      uploadUrlExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    filesRepository.markUploaded.mockResolvedValue({
      id: 'file-1',
      ownerId: 'user-1',
      key: 'users/user-1/general/2026-04-05/file.png',
      originalName: 'file.png',
      mimeType: 'image/png',
      size: 2500,
      status: 'UPLOADED',
      uploadedAt: new Date('2026-04-05T10:00:00.000Z'),
    });

    const response = await service.completeUpload(authUser, {
      fileId: '4a6524f6-1c98-4e2f-a2f1-7d3110f7dbe8',
    });

    expect(filesRepository.markUploaded).toHaveBeenCalledWith('file-1');
    expect(response.status).toBe('UPLOADED');
  });

  it('returns a presigned download url for uploaded files', async () => {
    filesRepository.findByIdForOwner.mockResolvedValue({
      id: 'file-1',
      ownerId: 'user-1',
      key: 'users/user-1/general/2026-04-05/file.png',
      originalName: 'file.png',
      mimeType: 'image/png',
      size: 2500,
      status: 'UPLOADED',
      uploadedAt: new Date('2026-04-05T10:00:00.000Z'),
    });
    storageService.createPresignedDownloadUrl.mockResolvedValue(
      'https://download.url',
    );

    const response = await service.requestDownloadUrl(
      authUser,
      '4a6524f6-1c98-4e2f-a2f1-7d3110f7dbe8',
      'attachment',
    );

    expect(storageService.createPresignedDownloadUrl).toHaveBeenCalledWith({
      key: 'users/user-1/general/2026-04-05/file.png',
      filename: 'file.png',
      disposition: 'attachment',
    });
    expect(response.fileId).toBe('file-1');
    expect(response.downloadUrl).toBe('https://download.url');
    expect(response.visibility).toBe('PRIVATE');
  });

  it('returns the stable public url for public files instead of a signed read url', async () => {
    filesRepository.findByIdForOwner.mockResolvedValue({
      id: 'file-1',
      ownerId: 'user-1',
      key: 'users/user-1/avatar/2026-04-05/file.png',
      originalName: 'file.png',
      mimeType: 'image/png',
      size: 2500,
      visibility: 'PUBLIC',
      status: 'UPLOADED',
      uploadedAt: new Date('2026-04-05T10:00:00.000Z'),
    });

    const response = await service.requestDownloadUrl(
      authUser,
      '4a6524f6-1c98-4e2f-a2f1-7d3110f7dbe8',
    );

    expect(storageService.createPresignedDownloadUrl).not.toHaveBeenCalled();
    expect(response.downloadUrl).toBe(
      'https://cdn.example.com/users/user-1/avatar/2026-04-05/file.png',
    );
    expect(response.visibility).toBe('PUBLIC');
    expect(response.expiresAt).toBeUndefined();
  });

  it('throws when requesting a download url for a missing file', async () => {
    filesRepository.findByIdForOwner.mockResolvedValue(null);

    await expect(
      service.requestDownloadUrl(
        authUser,
        '4a6524f6-1c98-4e2f-a2f1-7d3110f7dbe8',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when requesting a download url for a pending file', async () => {
    filesRepository.findByIdForOwner.mockResolvedValue({
      id: 'file-1',
      ownerId: 'user-1',
      key: 'users/user-1/general/2026-04-05/file.png',
      originalName: 'file.png',
      mimeType: 'image/png',
      size: 2500,
      status: 'PENDING',
      uploadedAt: null,
    });

    await expect(
      service.requestDownloadUrl(
        authUser,
        '4a6524f6-1c98-4e2f-a2f1-7d3110f7dbe8',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns recent files for the authenticated user in demo list endpoint', async () => {
    filesRepository.findRecentByOwner.mockResolvedValue([
      {
        id: 'file-1',
        ownerId: 'user-1',
        key: 'users/user-1/pdf-demo/2026-04-09/file-1.pdf',
        originalName: 'file-1.pdf',
        mimeType: 'application/pdf',
        size: 1234,
        visibility: 'PRIVATE',
        status: 'UPLOADED',
        uploadedAt: new Date('2026-04-09T18:00:00.000Z'),
      },
      {
        id: 'file-2',
        ownerId: 'user-1',
        key: 'users/user-1/avatar/2026-04-09/file-2.png',
        originalName: 'file-2.png',
        mimeType: 'image/png',
        size: 4567,
        visibility: 'PUBLIC',
        status: 'UPLOADED',
        uploadedAt: new Date('2026-04-09T18:05:00.000Z'),
      },
    ]);

    const response = await service.listMyFilesDemo(authUser);

    expect(filesRepository.findRecentByOwner).toHaveBeenCalledWith('user-1');
    expect(response.total).toBe(2);
    expect(response.items).toHaveLength(2);
    expect(response.items[1]?.publicUrl).toBe(
      'https://cdn.example.com/users/user-1/avatar/2026-04-09/file-2.png',
    );
  });

  it('persists a server generated file and marks it as uploaded', async () => {
    const buffer = Buffer.from('pdf-binary');

    filesRepository.create.mockResolvedValue({
      id: 'file-1',
    });
    filesRepository.markUploaded.mockResolvedValue({
      id: 'file-1',
      ownerId: 'user-1',
      key: 'users/user-1/pdf-demo/2026-04-08/file.pdf',
      originalName: 'report.pdf',
      mimeType: 'application/pdf',
      size: buffer.length,
      status: 'UPLOADED',
      visibility: 'PRIVATE',
      uploadedAt: new Date('2026-04-08T18:00:00.000Z'),
    });

    const response = await service.createServerGeneratedFile(authUser, {
      filename: 'report.pdf',
      mimeType: 'application/pdf',
      buffer,
      purpose: 'pdf-demo',
      entityType: 'pdf-template',
      entityId: 'demo',
    });

    expect(filesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'user-1',
        originalName: 'report.pdf',
        mimeType: 'application/pdf',
        size: buffer.length,
        purpose: 'pdf-demo',
      }),
    );
    expect(storageService.putObject).toHaveBeenCalledTimes(1);
    const putObjectInput = storageService.putObject.mock.calls[0]?.[0];
    expect(putObjectInput).toBeDefined();
    expect(putObjectInput?.key).toContain('users/user-1/pdf-demo/');
    expect(putObjectInput?.body).toBe(buffer);
    expect(putObjectInput?.contentType).toBe('application/pdf');
    expect(filesRepository.markUploaded).toHaveBeenCalledWith('file-1');
    expect(response.status).toBe('UPLOADED');
  });

  it('marks generated file as failed when direct storage upload fails', async () => {
    filesRepository.create.mockResolvedValue({
      id: 'file-1',
    });
    storageService.putObject.mockRejectedValue(new Error('upload failed'));

    await expect(
      service.createServerGeneratedFile(authUser, {
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('pdf-binary'),
        purpose: 'pdf-demo',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(filesRepository.markFailed).toHaveBeenCalledWith('file-1');
  });

  it('does not mark generated file as failed when upload succeeds but finalize step fails', async () => {
    filesRepository.create.mockResolvedValue({
      id: 'file-1',
    });
    storageService.putObject.mockResolvedValue(undefined);
    filesRepository.markUploaded.mockRejectedValue(
      new Error('db update failed'),
    );

    await expect(
      service.createServerGeneratedFile(authUser, {
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('pdf-binary'),
        purpose: 'pdf-demo',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(storageService.putObject).toHaveBeenCalledTimes(1);
    expect(filesRepository.markUploaded).toHaveBeenCalledWith('file-1');
    expect(filesRepository.markFailed).not.toHaveBeenCalled();
  });
});

jest.mock('./organization-documents.repository', () => ({
  OrganizationDocumentsRepository: class OrganizationDocumentsRepository {},
}));

jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: {
      TransactionIsolationLevel: {
        Serializable: 'Serializable',
      },
    },
  }),
  { virtual: true },
);
jest.mock('@prisma/client', () => ({}), { virtual: true });
jest.mock(
  'generated/prisma/enums',
  () => ({
    OrganizationDocumentVisibility: {
      INTERNAL: 'INTERNAL',
      CONFIDENTIAL: 'CONFIDENTIAL',
    },
    OrganizationStatus: {
      ACTIVE: 'ACTIVE',
      PENDING: 'PENDING',
    },
    UploadStatus: {
      PENDING: 'PENDING',
      UPLOADED: 'UPLOADED',
      FAILED: 'FAILED',
    },
    UserRole: {
      COMPANY_OWNER: 'COMPANY_OWNER',
      COMPANY_EMPLOYEE: 'COMPANY_EMPLOYEE',
      ADMIN: 'ADMIN',
      SUPER_ADMIN: 'SUPER_ADMIN',
    },
    UserStatus: {
      ACTIVE: 'ACTIVE',
      PENDING: 'PENDING',
    },
  }),
  { virtual: true },
);

jest.mock(
  '../organization.repository',
  () => ({
    OrganizationRepository: class OrganizationRepository {},
  }),
  { virtual: true },
);

jest.mock(
  '../../infrastructure/storage',
  () => ({
    R2StorageService: class R2StorageService {},
  }),
  { virtual: true },
);

jest.mock(
  '../../infrastructure/config',
  () => ({
    ConfigService: class ConfigService {},
  }),
  { virtual: true },
);

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  OrganizationDocumentVisibility,
  OrganizationStatus,
  UploadStatus,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import { OrganizationDocumentsService } from './organization-documents.service';

describe('OrganizationDocumentsService', () => {
  let service: OrganizationDocumentsService;

  let documentsRepository: {
    transaction: jest.Mock;
    findLatestVersionByName: jest.Mock;
    create: jest.Mock;
    findByIdAndOrganization: jest.Mock;
    update: jest.Mock;
    listByOrganization: jest.Mock;
  };

  let organizationRepository: {
    findUnique: jest.Mock;
  };

  let configService: {
    fileUploadPresignExpiresSeconds: number;
    fileDownloadPresignExpiresSeconds: number;
  };

  let storageService: {
    createPresignedUploadUrl: jest.Mock;
    headObjectOrThrow: jest.Mock;
    createPresignedDownloadUrl: jest.Mock;
  };

  const owner = {
    id: 'user-1',
    email: 'owner@example.com',
    role: UserRole.COMPANY_OWNER,
    status: UserStatus.ACTIVE,
    organizationId: 'org-1',
  };

  const admin = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    organizationId: null,
  };

  const organization = {
    id: 'org-1',
    status: OrganizationStatus.ACTIVE,
  };

  const pendingDocument = {
    id: 'doc-1',
    organizationId: 'org-1',
    name: 'technical-spec.pdf',
    documentType: 'TECHNICAL_SPEC',
    version: 1,
    storagePath:
      'organizations/org-1/documents/technical-spec/2026-05-13/doc-1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    checksum: null,
    visibility: OrganizationDocumentVisibility.INTERNAL,
    status: UploadStatus.PENDING,
    uploadUrlExpiresAt: new Date(Date.now() + 60_000),
    uploadedAt: null,
    failedAt: null,
    uploadedById: 'user-1',
    createdAt: new Date('2026-05-13T10:00:00.000Z'),
  };

  beforeEach(() => {
    documentsRepository = {
      transaction: jest.fn((fn: (db: object) => Promise<unknown>) => fn({})),
      findLatestVersionByName: jest.fn(),
      create: jest.fn(),
      findByIdAndOrganization: jest.fn(),
      update: jest.fn(),
      listByOrganization: jest.fn(),
    };

    organizationRepository = {
      findUnique: jest.fn(),
    };

    configService = {
      fileUploadPresignExpiresSeconds: 300,
      fileDownloadPresignExpiresSeconds: 300,
    };

    storageService = {
      createPresignedUploadUrl: jest.fn(),
      headObjectOrThrow: jest.fn(),
      createPresignedDownloadUrl: jest.fn(),
    };

    service = new OrganizationDocumentsService(
      documentsRepository as never,
      organizationRepository as never,
      configService as never,
      storageService as never,
    );
  });

  it('creates a pending upload for an active same-org owner', async () => {
    organizationRepository.findUnique.mockResolvedValue(organization);
    documentsRepository.findLatestVersionByName.mockResolvedValue(null);
    documentsRepository.create.mockImplementation((input: object) => ({
      ...pendingDocument,
      ...input,
    }));
    storageService.createPresignedUploadUrl.mockResolvedValue(
      'https://upload.url',
    );

    const result = await service.createUpload(
      'org-1',
      {
        name: 'technical-spec.pdf',
        documentType: 'TECHNICAL_SPEC',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      },
      owner as never,
    );

    expect(documentsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        version: 1,
        status: UploadStatus.PENDING,
      }),
      {},
    );
    expect(result.uploadUrl).toBe('https://upload.url');
  });

  it('increments version for same-name uploads', async () => {
    organizationRepository.findUnique.mockResolvedValue(organization);
    documentsRepository.findLatestVersionByName.mockResolvedValue({
      ...pendingDocument,
      version: 3,
    });
    documentsRepository.create.mockImplementation((input: object) => ({
      ...pendingDocument,
      ...input,
    }));
    storageService.createPresignedUploadUrl.mockResolvedValue(
      'https://upload.url',
    );

    const result = await service.createUpload(
      'org-1',
      {
        name: 'technical-spec.pdf',
        documentType: 'TECHNICAL_SPEC',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      },
      owner as never,
    );

    expect(result.version).toBe(4);
  });

  it('forbids cross-org company access', async () => {
    organizationRepository.findUnique.mockResolvedValue(organization);

    await expect(
      service.listDocuments('org-1', {
        ...owner,
        organizationId: 'org-2',
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows admin access across organizations', async () => {
    organizationRepository.findUnique.mockResolvedValue(organization);
    documentsRepository.listByOrganization.mockResolvedValue([pendingDocument]);

    const result = await service.listDocuments('org-1', admin as never);

    expect(result).toHaveLength(1);
  });

  it('rejects unsupported mime types', async () => {
    organizationRepository.findUnique.mockResolvedValue(organization);

    await expect(
      service.createUpload(
        'org-1',
        {
          name: 'image.png',
          documentType: 'TECHNICAL_SPEC',
          mimeType: 'image/png',
          sizeBytes: 1024,
        },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects oversized uploads', async () => {
    organizationRepository.findUnique.mockResolvedValue(organization);

    await expect(
      service.createUpload(
        'org-1',
        {
          name: 'technical-spec.pdf',
          documentType: 'TECHNICAL_SPEC',
          mimeType: 'application/pdf',
          sizeBytes: 20 * 1024 * 1024 + 1,
        },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('marks a pending upload as uploaded on complete', async () => {
    organizationRepository.findUnique.mockResolvedValue(organization);
    documentsRepository.findByIdAndOrganization.mockResolvedValue(
      pendingDocument,
    );
    storageService.headObjectOrThrow.mockResolvedValue({
      ContentType: 'application/pdf',
      ContentLength: 1024,
    });
    documentsRepository.update.mockResolvedValue({
      ...pendingDocument,
      status: UploadStatus.UPLOADED,
      uploadedAt: new Date('2026-05-13T10:02:00.000Z'),
      checksum: 'sha256:abcd',
    });

    const result = await service.completeUpload(
      'org-1',
      'doc-1',
      {
        sizeBytes: 1024,
        checksum: 'sha256:abcd',
      },
      owner as never,
    );

    expect(result.status).toBe(UploadStatus.UPLOADED);
    expect(documentsRepository.update).toHaveBeenCalledWith(
      { id: 'doc-1' },
      expect.objectContaining({
        status: UploadStatus.UPLOADED,
        checksum: 'sha256:abcd',
      }),
    );
  });

  it('rejects download for pending documents', async () => {
    organizationRepository.findUnique.mockResolvedValue(organization);
    documentsRepository.findByIdAndOrganization.mockResolvedValue(
      pendingDocument,
    );

    await expect(
      service.requestDownload('org-1', 'doc-1', owner as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

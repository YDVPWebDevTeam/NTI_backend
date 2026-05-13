import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  Organization,
  OrganizationDocument,
  Prisma,
} from 'generated/prisma/client';
import {
  OrganizationDocumentVisibility,
  OrganizationStatus,
  UploadStatus,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import { isAdminRole } from '../../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { isUniqueConstraintOnFields } from '../../common/prisma/prisma-error.utils';
import { ConfigService } from '../../infrastructure/config';
import type { PrismaDbClient } from '../../infrastructure/database';
import { R2StorageService } from '../../infrastructure/storage';
import { OrganizationRepository } from '../organization.repository';
import { CompleteOrganizationDocumentUploadDto } from './dto/complete-organization-document-upload.dto';
import { CreateOrganizationDocumentUploadDto } from './dto/create-organization-document-upload.dto';
import { OrganizationDocumentDownloadDto } from './dto/organization-document-download.dto';
import { OrganizationDocumentDto } from './dto/organization-document.dto';
import { OrganizationDocumentUploadDto } from './dto/organization-document-upload.dto';
import { OrganizationDocumentsRepository } from './organization-documents.repository';

const VERSION_RETRY_LIMIT = 2;
const MIME_EXTENSION_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
};

@Injectable()
export class OrganizationDocumentsService {
  private readonly transactionOptions = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  } as const;

  constructor(
    private readonly documentsRepository: OrganizationDocumentsRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly configService: ConfigService,
    private readonly storageService: R2StorageService,
  ) {}

  async createUpload(
    organizationId: string,
    dto: CreateOrganizationDocumentUploadDto,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationDocumentUploadDto> {
    const organization = await this.ensureDocumentAccess(organizationId, user);
    this.validateUploadPolicy(dto);

    const expiresAt = this.resolveUploadUrlExpiryDate();
    const visibility =
      dto.visibility ?? OrganizationDocumentVisibility.INTERNAL;

    let document: OrganizationDocument | null = null;
    let attempts = 0;

    while (attempts <= VERSION_RETRY_LIMIT && !document) {
      attempts += 1;

      try {
        document = await this.documentsRepository.transaction(async (db) => {
          const latest = await this.documentsRepository.findLatestVersionByName(
            organization.id,
            dto.name,
            db,
          );
          const version = (latest?.version ?? 0) + 1;
          const storagePath = this.buildStoragePath(
            organization.id,
            dto.name,
            dto.mimeType,
          );

          return this.documentsRepository.create(
            {
              organizationId: organization.id,
              name: dto.name,
              documentType: dto.documentType.trim(),
              version,
              storagePath,
              mimeType: dto.mimeType,
              sizeBytes: dto.sizeBytes,
              checksum: dto.checksum?.trim() || null,
              visibility,
              status: UploadStatus.PENDING,
              uploadUrlExpiresAt: expiresAt,
              uploadedById: user.id,
            },
            db,
          );
        }, this.transactionOptions);
      } catch (error: unknown) {
        if (
          attempts <= VERSION_RETRY_LIMIT &&
          isUniqueConstraintOnFields(error, [
            'organizationId',
            'name',
            'version',
          ])
        ) {
          continue;
        }

        throw error;
      }
    }

    if (!document) {
      throw new ConflictException('Failed to allocate document version');
    }

    const uploadUrl = await this.storageService.createPresignedUploadUrl({
      key: document.storagePath,
      contentType: document.mimeType,
    });

    return {
      documentId: document.id,
      version: document.version,
      visibility: document.visibility,
      status: document.status,
      uploadUrl,
      expiresAt: document.uploadUrlExpiresAt.toISOString(),
      checksum: document.checksum ?? undefined,
    };
  }

  async completeUpload(
    organizationId: string,
    documentId: string,
    dto: CompleteOrganizationDocumentUploadDto,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationDocumentDto> {
    await this.ensureDocumentAccess(organizationId, user);
    const document = await this.getDocumentForOrganizationOrThrow(
      documentId,
      organizationId,
    );

    if (document.status === UploadStatus.UPLOADED) {
      return this.toDocumentDto(document);
    }

    if (document.status === UploadStatus.FAILED) {
      throw new ConflictException('Upload has already failed');
    }

    if (document.uploadUrlExpiresAt.getTime() < Date.now()) {
      throw new ConflictException('Upload URL has expired');
    }

    if (this.configService.organizationDocumentVerifyObjectOnComplete) {
      const objectInfo = await this.storageService.headObjectOrThrow(
        document.storagePath,
      );

      if (
        objectInfo.ContentType &&
        objectInfo.ContentType !== document.mimeType
      ) {
        throw new BadRequestException(
          'Uploaded object type does not match request',
        );
      }

      if (
        objectInfo.ContentLength &&
        objectInfo.ContentLength !== document.sizeBytes
      ) {
        throw new BadRequestException(
          'Uploaded object size does not match request',
        );
      }
    }

    if (dto.sizeBytes && dto.sizeBytes !== document.sizeBytes) {
      throw new BadRequestException(
        'Uploaded object size does not match request',
      );
    }

    const updatedDocument = await this.documentsRepository.update(
      { id: document.id },
      {
        status: UploadStatus.UPLOADED,
        uploadedAt: new Date(),
        checksum: dto.checksum?.trim() || document.checksum,
      },
    );

    return this.toDocumentDto(updatedDocument);
  }

  async listDocuments(
    organizationId: string,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationDocumentDto[]> {
    await this.ensureDocumentAccess(organizationId, user);
    const documents =
      await this.documentsRepository.listByOrganization(organizationId);

    return documents.map((document) => this.toDocumentDto(document));
  }

  async requestDownload(
    organizationId: string,
    documentId: string,
    user: AuthenticatedUserContext,
  ): Promise<OrganizationDocumentDownloadDto> {
    await this.ensureDocumentAccess(organizationId, user);
    const document = await this.getDocumentForOrganizationOrThrow(
      documentId,
      organizationId,
    );

    if (document.status !== UploadStatus.UPLOADED) {
      throw new ConflictException('Document is not available for reading yet');
    }

    const downloadUrl = await this.storageService.createPresignedDownloadUrl({
      key: document.storagePath,
      filename: document.name,
      disposition: 'attachment',
    });

    return {
      documentId: document.id,
      downloadUrl,
      expiresAt: this.resolveDownloadUrlExpiryDate().toISOString(),
    };
  }

  private async ensureDocumentAccess(
    organizationId: string,
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (isAdminRole(user.role)) {
      return organization;
    }

    if (
      (user.role !== UserRole.COMPANY_OWNER &&
        user.role !== UserRole.COMPANY_EMPLOYEE) ||
      user.status !== UserStatus.ACTIVE ||
      !user.organizationId ||
      user.organizationId !== organizationId
    ) {
      throw new ForbiddenException();
    }

    if (organization.status !== OrganizationStatus.ACTIVE) {
      throw new ForbiddenException(
        'Only active organization members may manage organization documents',
      );
    }

    return organization;
  }

  private async getDocumentForOrganizationOrThrow(
    documentId: string,
    organizationId: string,
    db?: PrismaDbClient,
  ): Promise<OrganizationDocument> {
    const document = await this.documentsRepository.findByIdAndOrganization(
      documentId,
      organizationId,
      db,
    );

    if (!document) {
      throw new NotFoundException('Organization document not found');
    }

    return document;
  }

  private validateUploadPolicy(dto: CreateOrganizationDocumentUploadDto): void {
    if (dto.sizeBytes > this.configService.organizationDocumentMaxSizeBytes) {
      throw new PayloadTooLargeException('File is too large');
    }

    const allowedMimeTypes =
      this.configService.organizationDocumentAllowedMimeTypes;

    if (!allowedMimeTypes.includes(dto.mimeType)) {
      throw new BadRequestException('File type is not allowed');
    }
  }

  private buildStoragePath(
    organizationId: string,
    name: string,
    mimeType: string,
  ): string {
    const dayPrefix = new Date().toISOString().slice(0, 10);
    const extension = this.resolveExtension(name, mimeType);
    const safeName = this.sanitizeSegment(name.replace(/\.[^.]+$/, ''));

    return `organizations/${organizationId}/documents/${safeName}/${dayPrefix}/${randomUUID()}.${extension}`;
  }

  private sanitizeSegment(value: string): string {
    const safeValue = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-');

    return safeValue || 'document';
  }

  private resolveExtension(name: string, mimeType: string): string {
    const fileExt = path.extname(name).slice(1).toLowerCase();

    if (/^[a-z0-9]{1,12}$/.test(fileExt)) {
      return fileExt;
    }

    return MIME_EXTENSION_MAP[mimeType] ?? 'bin';
  }

  private resolveUploadUrlExpiryDate(): Date {
    return new Date(
      Date.now() + this.configService.fileUploadPresignExpiresSeconds * 1000,
    );
  }

  private resolveDownloadUrlExpiryDate(): Date {
    return new Date(
      Date.now() + this.configService.fileDownloadPresignExpiresSeconds * 1000,
    );
  }

  private toDocumentDto(
    document: OrganizationDocument,
  ): OrganizationDocumentDto {
    return {
      id: document.id,
      name: document.name,
      documentType: document.documentType,
      version: document.version,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      checksum: document.checksum,
      visibility: document.visibility,
      status: document.status,
      uploadedById: document.uploadedById,
      uploadedAt: document.uploadedAt?.toISOString(),
      createdAt: document.createdAt.toISOString(),
    };
  }
}

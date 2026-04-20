import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { UploadedFile } from '../../generated/prisma/client';
import { FileVisibility, UploadStatus } from '../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ConfigService } from '../infrastructure/config';
import { R2StorageService } from '../infrastructure/storage';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import type { DownloadUrlDto } from './dto/download-url.dto';
import type { FileUrlDisposition } from './dto/request-download-url.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import type { UploadedFileDto } from './dto/uploaded-file.dto';
import type { UploadInstructionsDto } from './dto/upload-instructions.dto';
import { FilesRepository } from './files.repository';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

type CreateServerGeneratedFileInput = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  visibility?: FileVisibility;
  purpose?: string;
  entityType?: string;
  entityId?: string;
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly configService: ConfigService,
    private readonly storageService: R2StorageService,
  ) {}

  async requestUpload(
    authUser: AuthenticatedUserContext,
    dto: RequestUploadDto,
  ): Promise<UploadInstructionsDto> {
    this.validateUploadPolicy(dto);

    const key = this.buildStorageKey(authUser.id, dto);
    const expiresAt = this.resolveUploadUrlExpiryDate();
    const visibility = dto.visibility ?? FileVisibility.PRIVATE;

    const file = await this.filesRepository.create({
      ownerId: authUser.id,
      key,
      originalName: dto.filename,
      mimeType: dto.mimeType,
      size: dto.size,
      purpose: dto.purpose,
      entityType: dto.entityType,
      entityId: dto.entityId,
      visibility,
      uploadUrlExpiresAt: expiresAt,
    });

    const uploadUrl = await this.storageService.createPresignedUploadUrl({
      key,
      contentType: dto.mimeType,
    });

    return {
      fileId: file.id,
      key,
      visibility,
      uploadUrl,
      publicUrl: this.resolvePublicUrl(key, visibility),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async completeUpload(
    authUser: AuthenticatedUserContext,
    dto: CompleteUploadDto,
  ): Promise<UploadedFileDto> {
    const file = await this.filesRepository.findByIdForOwner(
      dto.fileId,
      authUser.id,
    );

    if (!file) {
      throw new NotFoundException('Upload record was not found');
    }

    if (file.status === UploadStatus.UPLOADED) {
      return this.toUploadedFileDto(file);
    }

    if (file.status === UploadStatus.FAILED) {
      throw new ConflictException('Upload has already failed');
    }

    if (file.uploadUrlExpiresAt.getTime() < Date.now()) {
      throw new ConflictException('Upload URL has expired');
    }

    if (this.configService.fileUploadVerifyObjectOnComplete) {
      const objectInfo = await this.storageService.headObjectOrThrow(file.key);

      if (objectInfo.ContentType && objectInfo.ContentType !== file.mimeType) {
        throw new BadRequestException(
          'Uploaded object type does not match request',
        );
      }

      if (objectInfo.ContentLength && objectInfo.ContentLength !== file.size) {
        throw new BadRequestException(
          'Uploaded object size does not match request',
        );
      }
    }

    if (dto.size && dto.size !== file.size) {
      throw new BadRequestException(
        'Uploaded object size does not match request',
      );
    }

    const updatedFile = await this.filesRepository.markUploaded(file.id);

    return this.toUploadedFileDto(updatedFile);
  }

  async requestDownloadUrl(
    authUser: AuthenticatedUserContext,
    fileId: string,
    disposition: FileUrlDisposition = 'inline',
  ): Promise<DownloadUrlDto> {
    const file = await this.filesRepository.findByIdForOwner(
      fileId,
      authUser.id,
    );

    if (!file) {
      throw new NotFoundException('File was not found');
    }

    const visibility = this.normalizeVisibility(file.visibility);

    if (file.status !== UploadStatus.UPLOADED) {
      throw new ConflictException('File is not available for reading yet');
    }

    if (visibility === FileVisibility.PUBLIC) {
      return {
        fileId: file.id,
        downloadUrl: this.resolveRequiredPublicUrl(file.key),
        visibility,
      };
    }

    const downloadUrl = await this.storageService.createPresignedDownloadUrl({
      key: file.key,
      filename: file.originalName,
      disposition,
    });
    const expiresAt = this.resolveDownloadUrlExpiryDate();

    return {
      fileId: file.id,
      downloadUrl,
      visibility,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async createServerGeneratedFile(
    authUser: AuthenticatedUserContext,
    input: CreateServerGeneratedFileInput,
  ): Promise<UploadedFileDto> {
    const requestUploadDto: RequestUploadDto = {
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.buffer.length,
      visibility: input.visibility,
      purpose: input.purpose,
      entityType: input.entityType,
      entityId: input.entityId,
    };

    this.validateUploadPolicy(requestUploadDto);

    const key = this.buildStorageKey(authUser.id, requestUploadDto);
    const visibility = input.visibility ?? FileVisibility.PRIVATE;

    const file = await this.filesRepository.create({
      ownerId: authUser.id,
      key,
      originalName: input.filename,
      mimeType: input.mimeType,
      size: input.buffer.length,
      purpose: input.purpose,
      entityType: input.entityType,
      entityId: input.entityId,
      visibility,
      uploadUrlExpiresAt: new Date(),
    });

    try {
      await this.storageService.putObject({
        key,
        body: input.buffer,
        contentType: input.mimeType,
        metadata: {
          fileId: file.id,
          ownerId: authUser.id,
          source: 'server-generated',
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to upload generated file "${file.id}" to storage: ${message}`,
        stack,
      );

      await this.filesRepository
        .markFailed(file.id)
        .catch((markFailedError) => {
          const markFailedMessage =
            markFailedError instanceof Error
              ? markFailedError.message
              : String(markFailedError);
          const markFailedStack =
            markFailedError instanceof Error
              ? markFailedError.stack
              : undefined;

          this.logger.error(
            `Failed to mark generated file "${file.id}" as FAILED: ${markFailedMessage}`,
            markFailedStack,
          );
        });

      throw new InternalServerErrorException(
        'Failed to upload generated file to storage',
      );
    }

    try {
      const uploadedFile = await this.filesRepository.markUploaded(file.id);
      return this.toUploadedFileDto(uploadedFile);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to mark generated file "${file.id}" as UPLOADED: ${message}`,
        stack,
      );

      throw new InternalServerErrorException(
        'Failed to finalize generated file upload',
      );
    }
  }

  private toUploadedFileDto(file: UploadedFile): UploadedFileDto {
    const visibility = this.normalizeVisibility(file.visibility);

    return {
      id: file.id,
      ownerId: file.ownerId,
      key: file.key,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      visibility,
      status: file.status,
      publicUrl: this.resolvePublicUrl(file.key, visibility),
      uploadedAt: file.uploadedAt?.toISOString(),
    };
  }

  private validateUploadPolicy(dto: RequestUploadDto): void {
    if (dto.size > this.configService.fileUploadMaxSizeBytes) {
      throw new PayloadTooLargeException('File is too large');
    }

    const allowedMimeTypes = this.configService.fileUploadAllowedMimeTypes;

    if (!allowedMimeTypes.includes(dto.mimeType)) {
      throw new BadRequestException('File type is not allowed');
    }

    if (
      dto.visibility === FileVisibility.PUBLIC &&
      !this.configService.r2PublicBaseUrl
    ) {
      throw new BadRequestException(
        'Public file uploads require R2_PUBLIC_BASE_URL to be configured',
      );
    }
  }

  private buildStorageKey(ownerId: string, dto: RequestUploadDto): string {
    const dayPrefix = new Date().toISOString().slice(0, 10);
    const purpose = this.sanitizeSegment(dto.purpose ?? 'general');
    const extension = this.resolveExtension(dto.filename, dto.mimeType);

    return `users/${ownerId}/${purpose}/${dayPrefix}/${randomUUID()}.${extension}`;
  }

  private sanitizeSegment(value: string): string {
    const safeValue = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-');

    return safeValue || 'general';
  }

  private resolveExtension(filename: string, mimeType: string): string {
    const fileExt = path.extname(filename).slice(1).toLowerCase();

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

  private resolvePublicUrl(
    key: string,
    visibility: FileVisibility,
  ): string | undefined {
    if (visibility !== FileVisibility.PUBLIC) {
      return undefined;
    }

    return this.storageService.buildPublicUrl(key);
  }

  private resolveRequiredPublicUrl(key: string): string {
    return this.storageService.buildPublicUrl(key);
  }

  private normalizeVisibility(
    visibility: FileVisibility | null | undefined,
  ): FileVisibility {
    return visibility ?? FileVisibility.PRIVATE;
  }
}

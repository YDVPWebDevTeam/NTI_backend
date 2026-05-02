import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApplicationDocumentScope,
  DocumentType,
  FileVisibility,
  UploadStatus,
} from '../../../generated/prisma/enums';

export class ApplicationDocumentDto {
  @ApiProperty({ example: 'f6c90688-c973-40ca-8f3b-c55667cc6f77' })
  id!: string;

  @ApiProperty({ example: '87dcb0e9-2f7e-4ab5-b014-d2f1204bc138' })
  applicationId!: string;

  @ApiProperty({ enum: DocumentType })
  documentType!: DocumentType;

  @ApiProperty({ enum: ApplicationDocumentScope })
  documentScope!: ApplicationDocumentScope;

  @ApiPropertyOptional({ example: 'b91e88db-5d96-443d-956b-ac4fdcbf95f7' })
  memberUserId!: string | null;

  @ApiProperty({ example: 'd8d89d76-1a4c-4cc8-b804-e7fcf58567af' })
  uploadedFileId!: string;

  @ApiProperty({ example: 2 })
  version!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 'budget.pdf' })
  originalName!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: 124991 })
  size!: number;

  @ApiProperty({ enum: FileVisibility })
  visibility!: FileVisibility;

  @ApiProperty({ enum: UploadStatus })
  uploadStatus!: UploadStatus;

  @ApiProperty({ example: 'user-1' })
  uploadedFileOwnerId!: string;

  @ApiProperty({ example: '2026-05-02T08:00:00.000Z' })
  createdAt!: Date;
}

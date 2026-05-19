import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProgramBBacklogDocumentCategory,
  ProgramBDocumentVisibility,
  UploadStatus,
} from 'generated/prisma/enums';

export class ProgramBBacklogDocumentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  fileId!: string;

  @ApiProperty({ enum: ProgramBBacklogDocumentCategory })
  category!: ProgramBBacklogDocumentCategory;

  @ApiProperty({ enum: ProgramBDocumentVisibility })
  visibility!: ProgramBDocumentVisibility;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  size!: number;

  @ApiProperty({ enum: UploadStatus })
  status!: UploadStatus;

  @ApiProperty()
  version!: number;

  @ApiPropertyOptional()
  uploadedAt?: Date;

  @ApiProperty()
  createdAt!: Date;
}

export class ProgramBBacklogDocumentUploadDto {
  @ApiProperty({ format: 'uuid' })
  documentId!: string;

  @ApiProperty({ format: 'uuid' })
  fileId!: string;

  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty()
  expiresAt!: string;
}

export class ProgramBDocumentDownloadDto {
  @ApiProperty({ format: 'uuid' })
  documentId!: string;

  @ApiProperty()
  downloadUrl!: string;

  @ApiPropertyOptional()
  expiresAt?: string;
}

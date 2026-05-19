import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProgramBDocumentVisibility,
  ProgramBProjectDocumentCategory,
  UploadStatus,
} from 'generated/prisma/enums';

export class ProgramBProjectDocumentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  fileId!: string;

  @ApiProperty({ enum: ProgramBProjectDocumentCategory })
  category!: ProgramBProjectDocumentCategory;

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

export class ProgramBProjectDocumentUploadDto {
  @ApiProperty({ format: 'uuid' })
  documentId!: string;

  @ApiProperty({ format: 'uuid' })
  fileId!: string;

  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty()
  expiresAt!: string;
}

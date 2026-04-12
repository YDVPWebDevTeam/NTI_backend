import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileVisibility, UploadStatus } from '../../../generated/prisma/enums';

export class UploadedFileDto {
  @ApiProperty({
    description: 'Internal file record id.',
  })
  id!: string;

  @ApiProperty({
    description: 'Owner user id.',
  })
  ownerId!: string;

  @ApiProperty({
    description: 'Storage object key.',
  })
  key!: string;

  @ApiProperty({
    description: 'Original filename from frontend.',
  })
  originalName!: string;

  @ApiProperty({
    description: 'Stored file MIME type.',
  })
  mimeType!: string;

  @ApiProperty({
    description: 'Expected file size in bytes.',
  })
  size!: number;

  @ApiProperty({
    description: 'Visibility selected for the file.',
    enum: FileVisibility,
  })
  visibility!: FileVisibility;

  @ApiProperty({
    description: 'Current upload status.',
    enum: UploadStatus,
  })
  status!: UploadStatus;

  @ApiPropertyOptional({
    description:
      'Stable public URL for reading the file when visibility is PUBLIC.',
  })
  publicUrl?: string;

  @ApiPropertyOptional({
    description: 'Upload finalized at.',
  })
  uploadedAt?: string;
}

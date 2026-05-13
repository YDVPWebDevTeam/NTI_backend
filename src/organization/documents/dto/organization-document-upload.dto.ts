import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrganizationDocumentVisibility,
  UploadStatus,
} from 'generated/prisma/enums';

export class OrganizationDocumentUploadDto {
  @ApiProperty({
    example: 'a16947f8-8f55-4a70-906d-f5dd15c92256',
  })
  documentId!: string;

  @ApiProperty({
    example: 2,
  })
  version!: number;

  @ApiProperty({
    enum: OrganizationDocumentVisibility,
    example: OrganizationDocumentVisibility.INTERNAL,
  })
  visibility!: OrganizationDocumentVisibility;

  @ApiProperty({
    enum: UploadStatus,
    example: UploadStatus.PENDING,
  })
  status!: UploadStatus;

  @ApiProperty({
    description: 'Temporary signed URL for direct upload to storage.',
  })
  uploadUrl!: string;

  @ApiProperty({
    example: '2026-05-13T12:05:00.000Z',
  })
  expiresAt!: string;

  @ApiPropertyOptional({
    example: 'sha256:abcd1234',
  })
  checksum?: string;
}

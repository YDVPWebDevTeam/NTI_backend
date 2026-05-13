import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrganizationDocumentVisibility,
  UploadStatus,
} from 'generated/prisma/enums';

export class OrganizationDocumentDto {
  @ApiProperty({
    example: 'a16947f8-8f55-4a70-906d-f5dd15c92256',
  })
  id!: string;

  @ApiProperty({
    example: 'technical-spec.pdf',
  })
  name!: string;

  @ApiProperty({
    example: 'TECHNICAL_SPEC',
  })
  documentType!: string;

  @ApiProperty({
    example: 2,
  })
  version!: number;

  @ApiProperty({
    example: 'application/pdf',
  })
  mimeType!: string;

  @ApiProperty({
    example: 1_048_576,
  })
  sizeBytes!: number;

  @ApiPropertyOptional({
    example: 'sha256:abcd1234',
  })
  checksum?: string | null;

  @ApiProperty({
    enum: OrganizationDocumentVisibility,
    example: OrganizationDocumentVisibility.INTERNAL,
  })
  visibility!: OrganizationDocumentVisibility;

  @ApiProperty({
    enum: UploadStatus,
    example: UploadStatus.UPLOADED,
  })
  status!: UploadStatus;

  @ApiProperty({
    example: 'user-1',
  })
  uploadedById!: string;

  @ApiPropertyOptional({
    example: '2026-05-13T12:03:00.000Z',
  })
  uploadedAt?: string;

  @ApiProperty({
    example: '2026-05-13T12:00:00.000Z',
  })
  createdAt!: string;
}

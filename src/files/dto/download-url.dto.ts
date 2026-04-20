import { FileVisibility } from '../../../generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DownloadUrlDto {
  @ApiProperty({
    description: 'Internal file record id.',
    example: 'a16947f8-8f55-4a70-906d-f5dd15c92256',
  })
  fileId!: string;

  @ApiProperty({
    description:
      'URL for reading the file. PRIVATE files receive a temporary presigned URL. PUBLIC files receive a stable public URL.',
    example:
      'https://93a195452e08956a31bcbd3b8d185d5f.r2.cloudflarestorage.com/nti-bucket/users/fae01d73-b528-4af1-9765-f22ba9cf6e02/general/2026-04-08/dc1f54c3-8bd3-41a1-ae9f-5eb039715c1f.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&x-id=GetObject',
  })
  downloadUrl!: string;

  @ApiProperty({
    enum: FileVisibility,
    example: FileVisibility.PRIVATE,
    description: 'Visibility applied to the file.',
  })
  visibility!: FileVisibility;

  @ApiPropertyOptional({
    description:
      'ISO timestamp when the read URL expires. Present for PRIVATE files and omitted for PUBLIC files.',
    example: '2026-04-08T20:10:00.000Z',
  })
  expiresAt?: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class OrganizationDocumentDownloadDto {
  @ApiProperty({
    example: 'a16947f8-8f55-4a70-906d-f5dd15c92256',
  })
  documentId!: string;

  @ApiProperty({
    description: 'Temporary signed URL for downloading the document.',
  })
  downloadUrl!: string;

  @ApiProperty({
    example: '2026-05-13T12:10:00.000Z',
  })
  expiresAt!: string;
}

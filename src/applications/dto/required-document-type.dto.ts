import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../../../generated/prisma/enums';

export class RequiredDocumentTypeDto {
  @ApiProperty({ example: 'e7167d41-c4af-4f71-a6e6-bba77f6bb646' })
  id!: string;

  @ApiProperty({ enum: DocumentType })
  documentType!: DocumentType;

  @ApiProperty({ example: true })
  isRequired!: boolean;
}

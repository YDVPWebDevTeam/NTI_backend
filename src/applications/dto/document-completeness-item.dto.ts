import { ApiProperty } from '@nestjs/swagger';
import {
  ApplicationDocumentScope,
  DocumentType,
} from '../../../generated/prisma/enums';

export class DocumentCompletenessItemDto {
  @ApiProperty({ enum: DocumentType })
  documentType!: DocumentType;

  @ApiProperty({ enum: ApplicationDocumentScope })
  documentScope!: ApplicationDocumentScope;

  @ApiProperty({ example: 'user-2', nullable: true })
  memberUserId!: string | null;
}

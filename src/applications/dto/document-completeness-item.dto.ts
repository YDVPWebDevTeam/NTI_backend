import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApplicationDocumentScope,
  DocumentType,
} from '../../../generated/prisma/enums';

export class DocumentCompletenessItemDto {
  @ApiProperty({ enum: DocumentType })
  documentType!: DocumentType;

  @ApiProperty({ enum: ApplicationDocumentScope })
  documentScope!: ApplicationDocumentScope;

  @ApiPropertyOptional({ example: 'user-2' })
  memberUserId!: string | null;
}

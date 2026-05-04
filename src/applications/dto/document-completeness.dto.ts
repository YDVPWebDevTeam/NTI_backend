import { ApiProperty } from '@nestjs/swagger';
import { DocumentCompletenessItemDto } from './document-completeness-item.dto';

export class DocumentCompletenessDto {
  @ApiProperty({ example: 'application-1' })
  applicationId!: string;

  @ApiProperty({ example: true })
  isComplete!: boolean;

  @ApiProperty({ type: [DocumentCompletenessItemDto] })
  satisfiedDocuments!: DocumentCompletenessItemDto[];

  @ApiProperty({ type: [DocumentCompletenessItemDto] })
  missingDocuments!: DocumentCompletenessItemDto[];
}

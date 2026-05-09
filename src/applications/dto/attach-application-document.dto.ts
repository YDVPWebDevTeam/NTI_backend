import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DocumentType } from '../../../generated/prisma/enums';

export class AttachApplicationDocumentDto {
  @ApiProperty({
    description: 'Previously uploaded file identifier.',
    example: 'd8d89d76-1a4c-4cc8-b804-e7fcf58567af',
  })
  @IsUUID()
  fileId!: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @ApiPropertyOptional({
    description:
      'Required only for member-scoped CV attachments. Identifies the team member whose CV is being attached.',
    example: 'b91e88db-5d96-443d-956b-ac4fdcbf95f7',
  })
  @IsOptional()
  @IsUUID()
  memberUserId?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { ProgramType } from '../../../generated/prisma/enums';
import { RequiredDocumentTypeDto } from './required-document-type.dto';

export class RequiredDocumentsResponseDto {
  @ApiProperty({ example: '87dcb0e9-2f7e-4ab5-b014-d2f1204bc138' })
  callId!: string;

  @ApiProperty({ enum: ProgramType })
  programType!: ProgramType;

  @ApiProperty({ type: [RequiredDocumentTypeDto] })
  requiredDocuments!: RequiredDocumentTypeDto[];
}

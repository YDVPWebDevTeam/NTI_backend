import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProgramBBacklogDocumentCategory,
  ProgramBDocumentVisibility,
} from 'generated/prisma/enums';
import {
  IsEnum,
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProgramBBacklogDocumentUploadDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  filename!: string;

  @ApiProperty()
  @IsMimeType()
  mimeType!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  size!: number;

  @ApiProperty({
    enum: ProgramBBacklogDocumentCategory,
    example: ProgramBBacklogDocumentCategory.TECHNICAL_SPECIFICATION,
  })
  @IsEnum(ProgramBBacklogDocumentCategory)
  category!: ProgramBBacklogDocumentCategory;

  @ApiPropertyOptional({
    enum: ProgramBDocumentVisibility,
    example: ProgramBDocumentVisibility.PARTICIPANTS,
  })
  @IsOptional()
  @IsEnum(ProgramBDocumentVisibility)
  visibility?: ProgramBDocumentVisibility;
}

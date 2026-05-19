import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProgramBDocumentVisibility,
  ProgramBProjectDocumentCategory,
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

export class CreateProgramBProjectDocumentUploadDto {
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
    enum: ProgramBProjectDocumentCategory,
    example: ProgramBProjectDocumentCategory.DELIVERABLE,
  })
  @IsEnum(ProgramBProjectDocumentCategory)
  category!: ProgramBProjectDocumentCategory;

  @ApiPropertyOptional({
    enum: ProgramBDocumentVisibility,
    example: ProgramBDocumentVisibility.PARTICIPANTS,
  })
  @IsOptional()
  @IsEnum(ProgramBDocumentVisibility)
  visibility?: ProgramBDocumentVisibility;
}

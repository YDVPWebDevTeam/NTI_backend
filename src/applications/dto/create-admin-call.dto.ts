import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DocumentType, ProgramType } from '../../../generated/prisma/enums';

const trimStringArray = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
    : value;

export class CreateAdminCallDto {
  @ApiProperty({ enum: ProgramType })
  @IsEnum(ProgramType)
  type!: ProgramType;

  @ApiProperty({ example: 'Spring 2026 Program A Call' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @IsOptional()
  @IsISO8601()
  opensAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @IsOptional()
  @IsISO8601()
  closesAt?: string | null;

  @ApiPropertyOptional({ enum: DocumentType, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(DocumentType, { each: true })
  requiredDocumentTypes?: DocumentType[];

  @ApiPropertyOptional({
    type: [String],
    example: ['AI', 'HealthTech', 'Education'],
    description: 'Program A category options rendered by the applicant form.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimStringArray(value))
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  programACategories?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['React', 'NestJS', 'Flutter'],
    description: 'Program A stack/tag options rendered by the applicant form.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimStringArray(value))
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  programAStackTags?: string[];

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minTeamSize?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTransferredSubjects?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  maxProfileSubjectsAverage?: number;
}

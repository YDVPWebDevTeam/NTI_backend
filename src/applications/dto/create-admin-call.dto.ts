import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';
import { DocumentType, ProgramType } from '../../../generated/prisma/enums';

export class ProgramACallOptionInputDto {
  @ApiProperty({ example: 'ai_data' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  value!: string;

  @ApiProperty({ example: 'AI & Data' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}

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

  @ApiPropertyOptional({
    type: [ProgramACallOptionInputDto],
    example: [
      {
        value: 'ai_data',
        label: 'AI & Data',
      },
      {
        value: 'web_applications',
        label: 'Web Applications',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramACallOptionInputDto)
  categories?: ProgramACallOptionInputDto[];

  @ApiPropertyOptional({
    type: [ProgramACallOptionInputDto],
    example: [
      {
        value: 'nestjs',
        label: 'NestJS',
      },
      {
        value: 'react',
        label: 'React',
      },
      {
        value: 'postgresql',
        label: 'PostgreSQL',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramACallOptionInputDto)
  stackTags?: ProgramACallOptionInputDto[];
}

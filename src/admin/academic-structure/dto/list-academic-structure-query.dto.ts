import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

function toOptionalBoolean(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return value;
}

export class ListAcademicStructureQueryDto {
  @ApiPropertyOptional({ example: 'nitra' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'When true, inactive records are also returned.',
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => toOptionalBoolean(value))
  @IsBoolean()
  includeInactive?: boolean;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { toOptionalBoolean } from '../../../common/validation/to-optional-boolean.transformer';

export class UniversitiesQueryDto {
  @ApiPropertyOptional({ example: 'nitra' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'When omitted, activeOnly=true is applied.',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  activeOnly?: boolean;
}

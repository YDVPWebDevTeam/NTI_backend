import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { toOptionalBoolean } from '../../../common/validation/to-optional-boolean.transformer';

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
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  includeInactive?: boolean;
}

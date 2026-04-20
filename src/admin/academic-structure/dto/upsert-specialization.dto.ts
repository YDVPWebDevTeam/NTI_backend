import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSpecializationDto {
  @ApiProperty({ example: 'd8d89d76-1a4c-4cc8-b804-e7fcf58567af' })
  @IsUUID()
  facultyId!: string;

  @ApiProperty({ example: 'Applied Informatics' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'AI' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @ApiPropertyOptional({ example: 'Ing.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  degreeLabel?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSpecializationDto extends PartialType(
  CreateSpecializationDto,
) {}

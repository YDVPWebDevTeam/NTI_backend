import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateUniversityDto {
  @ApiProperty({ example: 'Slovak University of Technology in Bratislava' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'STU' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  shortName?: string;

  @ApiPropertyOptional({ example: 'https://www.stuba.sk' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ example: 'Bratislava' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'sk' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUniversityDto extends PartialType(CreateUniversityDto) {}

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateOrganizationProfileDto {
  @ApiPropertyOptional({
    description: 'Organization legal or display name.',
    example: 'Test Company',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Slovak company identification number. Must contain 8 digits.',
    example: '12345678',
    pattern: '^\\d{8}$',
  })
  @IsOptional()
  @Matches(/^\d{8}$/, {
    message: 'ICO must be 8 digits',
  })
  ico?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Organization sector or industry.',
    example: 'IT',
    maxLength: 80,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sector?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Short organization description.',
    example: 'Software development company.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Organization website URL.',
    example: 'https://example.com',
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  website?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Organization logo URL.',
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string | null;
}

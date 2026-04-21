import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, Matches, IsOptional, IsUrl } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization legal or display name.',
    example: 'Test Company',
  })
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Slovak company identification number. Must contain 8 digits.',
    example: '12345678',
    pattern: '^\\d{8}$',
  })
  @Matches(/^\d{8}$/, {
    message: 'ICO must be 8 digits',
  })
  ico!: string;

  @ApiPropertyOptional({
    description: 'Organization sector or industry.',
    example: 'IT',
  })
  @IsOptional()
  sector?: string;

  @ApiPropertyOptional({
    description: 'Short organization description.',
    example: 'Software development company.',
  })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Organization website URL.',
    example: 'https://example.com',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Organization logo URL.',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}

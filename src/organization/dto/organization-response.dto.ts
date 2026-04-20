import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from 'generated/prisma/enums';

export class OrganizationResponseDto {
  @ApiProperty({
    description: 'Organization identifier.',
    format: 'uuid',
    example: 'd5af8ff2-69e9-4f31-bd0b-a2a226c9ffc5',
  })
  id!: string;

  @ApiProperty({
    description: 'Organization legal or display name.',
    example: 'Test Company',
  })
  name!: string;

  @ApiProperty({
    description: 'Slovak company identification number.',
    example: '12345678',
  })
  ico!: string;

  @ApiPropertyOptional({
    description: 'Organization sector or industry.',
    example: 'IT',
    nullable: true,
  })
  sector!: string | null;

  @ApiPropertyOptional({
    description: 'Short organization description.',
    example: 'Software development company.',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Organization website URL.',
    example: 'https://example.com',
    nullable: true,
  })
  website!: string | null;

  @ApiPropertyOptional({
    description: 'Organization logo URL.',
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  logoUrl!: string | null;

  @ApiProperty({
    description: 'Current organization lifecycle status.',
    enum: OrganizationStatus,
    example: OrganizationStatus.PENDING,
  })
  status!: OrganizationStatus;

  @ApiProperty({
    description: 'When the organization was created.',
    type: String,
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the organization was last updated.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: Date;
}

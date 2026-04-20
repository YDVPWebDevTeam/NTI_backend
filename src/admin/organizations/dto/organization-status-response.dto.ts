import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '../../../../generated/prisma/enums';

export class OrganizationStatusResponseDto {
  @ApiProperty({
    description: 'Organization identifier.',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  id!: string;

  @ApiProperty({
    description: 'Organization name.',
    example: 'Acme Labs s.r.o.',
  })
  name!: string;

  @ApiProperty({
    description: 'Organization status.',
    enum: OrganizationStatus,
    enumName: 'OrganizationStatus',
    example: OrganizationStatus.PENDING,
  })
  status!: OrganizationStatus;

  @ApiPropertyOptional({
    description: 'Website URL.',
    example: 'https://acme.example',
  })
  website?: string | null;

  @ApiPropertyOptional({
    description: 'Sector label.',
    example: 'IT Services',
  })
  sector?: string | null;

  @ApiPropertyOptional({
    description: 'Organization description.',
    example: 'Software development company.',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Logo URL.',
    example: 'https://cdn.example/logo.png',
  })
  logoUrl?: string | null;

  @ApiProperty({
    description: 'Organization ICO.',
    example: '12345678',
  })
  ico!: string;

  @ApiProperty({
    description: 'Creation timestamp.',
    example: '2026-04-01T10:15:30.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp.',
    example: '2026-04-02T10:15:30.000Z',
  })
  updatedAt!: Date;
}

import { ApiProperty } from '@nestjs/swagger';
import { OrganizationResponseDto } from '../../../organization/dto/organization-response.dto';

export class OrganizationOwnerSummaryDto {
  @ApiProperty({
    description: 'Owner user identifier.',
    format: 'uuid',
    example: '0bcb1a87-2b77-4a69-9e31-58f4f1b5c62c',
  })
  id!: string;

  @ApiProperty({
    description: 'Owner email address.',
    example: 'owner@example.com',
    format: 'email',
  })
  email!: string;

  @ApiProperty({
    description: 'Owner first name.',
    example: 'Jane',
  })
  firstName!: string;

  @ApiProperty({
    description: 'Owner last name.',
    example: 'Doe',
  })
  lastName!: string;
}

export class AdminOrganizationResponseDto extends OrganizationResponseDto {
  @ApiProperty({
    description: 'Company owner summary.',
    type: OrganizationOwnerSummaryDto,
  })
  owner!: OrganizationOwnerSummaryDto;
}

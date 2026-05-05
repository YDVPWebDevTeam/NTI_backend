import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../generated/prisma/enums';

export class OrganizationMemberResponseDto {
  @ApiProperty({
    description: 'User identifier.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Member first name.',
  })
  firstName!: string;

  @ApiProperty({
    description: 'Member last name.',
  })
  lastName!: string;

  @ApiProperty({
    description: 'Member email.',
    format: 'email',
  })
  email!: string;

  @ApiProperty({
    description: 'Member role in organization.',
    enum: UserRole,
  })
  role!: UserRole;

  @ApiProperty({
    description: 'Member account status.',
    enum: UserStatus,
  })
  status!: UserStatus;

  @ApiPropertyOptional({
    description: 'Organization id.',
    format: 'uuid',
    nullable: true,
  })
  organizationId!: string | null;

  @ApiProperty({
    description: 'When user was created.',
    type: String,
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When user was last updated.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: Date;
}

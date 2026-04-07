import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../generated/prisma/enums';

export class TeamUserDto {
  @ApiProperty({
    description: 'User identifier.',
    example: '1f0d8f2a-7f8d-4b6e-a6ed-8ce4db6f9c91',
  })
  id!: string;

  @ApiProperty({
    description: 'Display name.',
    example: 'Jan Novak',
  })
  name!: string;

  @ApiProperty({
    description: 'Email address.',
    example: 'student@nti.sk',
  })
  email!: string;

  @ApiProperty({
    enum: UserRole,
    description: 'Role of the user.',
    example: UserRole.STUDENT,
  })
  role!: UserRole;

  @ApiProperty({
    enum: UserStatus,
    description: 'Current user status.',
    example: UserStatus.PENDING,
  })
  status!: UserStatus;

  @ApiProperty({
    description: 'Whether the user confirmed their email address.',
    example: true,
  })
  isEmailConfirmed!: boolean;

  @ApiProperty({
    description: 'Whether the user was confirmed by an administrator.',
    example: false,
  })
  isAdminConfirmed!: boolean;

  @ApiProperty({
    description: 'Related organization identifier, if any.',
    nullable: true,
    example: null,
  })
  organizationId!: string | null;

  @ApiProperty({
    description: 'Timestamp when the user was created.',
    example: '2026-04-07T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Timestamp when the user was last updated.',
    example: '2026-04-07T12:00:00.000Z',
  })
  updatedAt!: Date;
}

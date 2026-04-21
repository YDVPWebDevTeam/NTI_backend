import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus, UserRole } from 'generated/prisma/enums';

export class OrganizationInviteResponseDto {
  @ApiProperty({
    description: 'Created organization invitation identifier.',
    format: 'uuid',
    example: '009c7ed2-f04d-4e35-816d-cbbdc227fcd0',
  })
  id!: string;

  @ApiProperty({
    description: 'Invitation recipient email.',
    example: 'employee@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Role assigned to the user after accepting the invitation.',
    enum: UserRole,
    example: UserRole.COMPANY_EMPLOYEE,
  })
  roleToAssign!: UserRole;

  @ApiProperty({
    description: 'Current invitation lifecycle status.',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @ApiProperty({
    description: 'Organization identifier this invitation belongs to.',
    format: 'uuid',
    example: 'd5af8ff2-69e9-4f31-bd0b-a2a226c9ffc5',
  })
  organizationId!: string;

  @ApiPropertyOptional({
    description: 'User identifier that revoked the invitation, when revoked.',
    format: 'uuid',
    nullable: true,
  })
  revokedById!: string | null;

  @ApiProperty({
    description: 'When the invitation was created.',
    type: String,
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the invitation becomes invalid.',
    type: String,
    format: 'date-time',
  })
  expiresAt!: Date;

  @ApiPropertyOptional({
    description: 'When the invitation was accepted.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  acceptedAt!: Date | null;

  @ApiProperty({
    description: 'When the invitation was last updated.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'When the invitation was revoked.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  revokedAt!: Date | null;
}

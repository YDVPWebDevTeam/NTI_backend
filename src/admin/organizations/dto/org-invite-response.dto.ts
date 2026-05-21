import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus, UserRole } from '../../../../generated/prisma/enums';

export class OrgInviteResponseDto {
  @ApiProperty({ description: 'Invitation identifier.', format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: 'Invite recipient email.',
    example: 'employee@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Role assigned after acceptance.',
    enum: UserRole,
  })
  roleToAssign!: UserRole;

  @ApiProperty({
    description: 'Current invitation status.',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @ApiProperty({ description: 'Organization identifier.', format: 'uuid' })
  organizationId!: string;

  @ApiPropertyOptional({
    description: 'User id who revoked invitation.',
    format: 'uuid',
    nullable: true,
  })
  revokedById?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  acceptedAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  revokedAt?: Date | null;
}

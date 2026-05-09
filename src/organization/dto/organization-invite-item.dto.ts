import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus } from 'generated/prisma/enums';

export class OrganizationInviteItemDto {
  @ApiProperty({
    description: 'Invitation identifier.',
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
    description: 'Invitation lifecycle status.',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @ApiProperty({
    description: 'When the invitation was created.',
    type: String,
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the invitation expires.',
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

  @ApiPropertyOptional({
    description: 'When the invitation was revoked.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  revokedAt!: Date | null;
}

import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus } from 'generated/prisma/enums';

export class RevokeOrganizationInviteResponseDto {
  @ApiProperty({
    description: 'Invitation identifier.',
    format: 'uuid',
    example: '009c7ed2-f04d-4e35-816d-cbbdc227fcd0',
  })
  id!: string;

  @ApiProperty({
    description: 'Revoke result status.',
    enum: InvitationStatus,
    example: InvitationStatus.REVOKED,
  })
  status: InvitationStatus = InvitationStatus.REVOKED;

  @ApiProperty({
    description: 'When the invitation was revoked.',
    type: String,
    format: 'date-time',
  })
  revokedAt!: Date;
}

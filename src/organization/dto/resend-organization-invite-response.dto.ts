import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus } from 'generated/prisma/enums';

export class ResendOrganizationInviteResponseDto {
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
    description: 'Resend result status.',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  status: InvitationStatus = InvitationStatus.PENDING;

  @ApiProperty({
    description: 'New invitation expiration timestamp.',
    type: String,
    format: 'date-time',
  })
  expiresAt!: Date;
}

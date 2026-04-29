import { ApiProperty } from '@nestjs/swagger';

export class RevokeOrganizationInviteResponseDto {
  @ApiProperty({
    description: 'Invitation identifier.',
    format: 'uuid',
    example: '009c7ed2-f04d-4e35-816d-cbbdc227fcd0',
  })
  id!: string;

  @ApiProperty({
    description: 'Revoke result status.',
    example: 'REVOKED',
  })
  status = 'REVOKED' as const;

  @ApiProperty({
    description: 'When the invitation was revoked.',
    type: String,
    format: 'date-time',
  })
  revokedAt!: Date;
}

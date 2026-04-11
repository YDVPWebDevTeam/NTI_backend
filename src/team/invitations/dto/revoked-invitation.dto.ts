import { ApiProperty } from '@nestjs/swagger';

export class RevokedInvitationDto {
  @ApiProperty({
    description: 'Invitation identifier.',
    example: '9c0ec8cb-4665-4504-ac02-b58a448f1b18',
  })
  id!: string;

  @ApiProperty({
    description: 'Invitation recipient email.',
    example: 'student@nti.sk',
  })
  email!: string;

  @ApiProperty({
    description: 'Invitation status after revoke action.',
    example: 'REVOKED',
  })
  status!: 'REVOKED';

  @ApiProperty({
    description: 'Timestamp when the invitation was revoked.',
    example: '2026-04-11T14:20:00.000Z',
  })
  revokedAt!: Date;
}

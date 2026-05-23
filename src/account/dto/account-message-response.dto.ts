import { ApiProperty } from '@nestjs/swagger';

export class AccountMessageResponseDto {
  @ApiProperty({
    description: 'Human-readable response message.',
    example:
      'Password changed successfully. All active refresh sessions were revoked.',
  })
  message!: string;
}

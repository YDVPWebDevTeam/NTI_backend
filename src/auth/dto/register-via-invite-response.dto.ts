import { ApiProperty } from '@nestjs/swagger';

export class RegisterViaInviteResponseDto {
  @ApiProperty({
    description: 'Human-readable response message.',
    example: 'Registration via invite completed successfully.',
  })
  message!: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Human-readable response message.',
    example: 'If the email exists, a reset link was sent.',
  })
  message!: string;
}

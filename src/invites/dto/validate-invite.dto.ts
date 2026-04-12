import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateInviteDto {
  @ApiProperty({
    description: 'Invitation token from the team invite link.',
    example: 'invite-token-123',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

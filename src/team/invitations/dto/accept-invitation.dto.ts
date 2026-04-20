import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    example: 'inv_1234567890abcdef',
    description: 'Invitation token from the email link.',
  })
  @IsString()
  @MinLength(1)
  token!: string;
}

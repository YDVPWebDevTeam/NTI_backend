import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ValidateOrganizationInviteDto {
  @ApiProperty({
    description: 'Invitation token from the organization invite link.',
    example: 'invite-token-123',
  })
  @IsString()
  @MinLength(1)
  token!: string;
}

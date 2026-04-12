import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PasswordValidation,
} from '../../common/validation/password.validation';

export class RegisterViaInviteDto {
  @ApiProperty({
    description: 'Display name of the invited user.',
    example: 'Jan Novak',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @ApiProperty({
    description: 'Invitation token from the team invite link.',
    example: 'invite-token-123',
  })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({
    description: 'Password for the new account.',
    example: 'StrongPass123!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @PasswordValidation()
  password!: string;
}

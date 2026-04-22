import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from 'src/common/validation/match.validation';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PasswordValidation,
} from 'src/common/validation/password.validation';

export class AcceptInviteOrgDto {
  @ApiProperty({
    description: 'Invitation token from the organization invite link.',
    example: 'invite-token-123',
  })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({
    description: 'First name of the invited user.',
    example: 'Martin',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({
    description: 'Last name of the invited user.',
    example: 'Novak',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({
    description: 'Password for the new account.',
    example: 'StrongPass123!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @PasswordValidation()
  password!: string;

  @ApiProperty({
    description: 'Password confirmation, must match password.',
    example: 'StrongPass123!',
  })
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword!: string;
}

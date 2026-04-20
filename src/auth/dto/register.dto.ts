import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';
import { EmailValidation } from '../../common/validation/email.validation';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PasswordValidation,
} from '../../common/validation/password.validation';

export class RegisterDto {
  @ApiProperty({
    description: 'Email for the new account.',
    example: 'new.student@nti.sk',
  })
  @EmailValidation()
  email!: string;

  @ApiProperty({
    description: 'First name of the new user.',
    example: 'Jan',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({
    description: 'Last name of the new user.',
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
}

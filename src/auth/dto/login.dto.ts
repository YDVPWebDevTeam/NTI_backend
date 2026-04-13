import { ApiProperty } from '@nestjs/swagger';
import { EmailValidation } from '../../common/validation/email.validation';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PasswordValidation,
} from '../../common/validation/password.validation';

export class LoginDto {
  @ApiProperty({
    description: 'Email used to sign in.',
    example: 'student@nti.sk',
  })
  @EmailValidation()
  email!: string;

  @ApiProperty({
    description: 'Account password.',
    example: 'StrongPass123!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @PasswordValidation()
  password!: string;
}

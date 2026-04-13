import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { EmailValidation } from '../../common/validation/email.validation';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PasswordValidation,
} from '../../common/validation/password.validation';

export class RegisterCompanyOwnerDto {
  @ApiProperty({
    example: 'owner@example.com',
    description: 'Company owner email address',
  })
  @EmailValidation()
  email!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the company owner',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'strongpass123',
    description: 'Password must contain letters and numbers',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @PasswordValidation()
  password!: string;
}

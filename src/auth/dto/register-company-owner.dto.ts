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
    example: 'John',
    description: 'First name of the company owner',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the company owner',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({
    example: 'strongpass123',
    description: 'Password must contain letters and numbers',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @PasswordValidation()
  password!: string;
}

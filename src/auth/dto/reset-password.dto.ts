import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PasswordValidation,
} from '../../common/validation/password.validation';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token sent to the user email address.',
    example: '8757a38e14fafbb0baf5bdef2f043fe78757a38e14fafbb0baf5bdef2f043fe7',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'New password for the account.',
    example: 'StrongPass123!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @PasswordValidation()
  password!: string;
}

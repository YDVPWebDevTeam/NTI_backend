import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PasswordValidation,
  ConfirmPasswordValidation,
} from '../../common/validation/password.validation';

export class ForceChangePasswordDto {
  @ApiProperty({
    description: 'The new password that will replace the temporary one.',
    example: 'NewStrongPass123!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @PasswordValidation()
  newPassword!: string;

  @ApiProperty({
    description: 'Must match `newPassword`.',
    example: 'NewStrongPass123!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @ConfirmPasswordValidation('newPassword', {
    message: 'Passwords do not match',
  })
  confirmNewPassword!: string;
}

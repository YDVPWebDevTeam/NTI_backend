import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  ConfirmPasswordValidation,
  PasswordValidation,
} from '../../common/validation/password.validation';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password of the authenticated account.',
    example: 'CurrentPass123',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @ApiProperty({
    description: 'New password that will replace the current password.',
    example: 'NewStrongPass123',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @PasswordValidation()
  newPassword!: string;

  @ApiProperty({
    description: 'Must match `newPassword`.',
    example: 'NewStrongPass123',
  })
  @ConfirmPasswordValidation('newPassword', {
    message: 'Passwords do not match',
  })
  confirmNewPassword!: string;
}

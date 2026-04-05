import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PasswordValidation } from '../../common/validation/password.validation';

export class ForceChangePasswordDto {
  @ApiProperty({
    description: 'The new password that will replace the temporary one.',
    example: 'NewStrongPass123!',
    minLength: 8,
    maxLength: 100,
  })
  @IsString()
  @PasswordValidation()
  newPassword!: string;

  @ApiProperty({
    description: 'Must match `newPassword`.',
    example: 'NewStrongPass123!',
    minLength: 8,
    maxLength: 100,
  })
  @PasswordValidation()
  confirmNewPassword!: string;
}

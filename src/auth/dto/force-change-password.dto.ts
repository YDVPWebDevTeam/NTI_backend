import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ForceChangePasswordDto {
  @ApiProperty({
    description: 'The new password that will replace the temporary one.',
    example: 'NewStrongPass123!',
    minLength: 8,
    maxLength: 100,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;

  @ApiProperty({
    description: 'Must match `newPassword`.',
    example: 'NewStrongPass123!',
    minLength: 8,
    maxLength: 100,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  confirmNewPassword!: string;
}

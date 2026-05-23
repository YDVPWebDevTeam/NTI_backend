import { ApiProperty } from '@nestjs/swagger';
import { EmailValidation } from '../../common/validation/email.validation';

export class ChangeEmailRequestDto {
  @ApiProperty({
    description: 'New email address that should replace the current one.',
    example: 'new-address@example.com',
  })
  @EmailValidation()
  newEmail!: string;
}

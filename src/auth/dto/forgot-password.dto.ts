import { ApiProperty } from '@nestjs/swagger';
import { EmailValidation } from '../../common/validation/email.validation';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send the password reset link to.',
    example: 'user@example.com',
  })
  @EmailValidation()
  email!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { EmailValidation } from '../../common/validation/email.validation';

export class ResendEmailDto {
  @ApiProperty({
    description:
      'The email address of the user to resend the verification email to',
    example: 'user@example.com',
  })
  @EmailValidation()
  email: string;
}

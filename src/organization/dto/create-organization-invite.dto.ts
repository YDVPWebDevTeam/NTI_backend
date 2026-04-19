import { ApiProperty } from '@nestjs/swagger';
import { EmailValidation } from 'src/common/validation/email.validation';

export class CreateOrganizationInviteDto {
  @ApiProperty({
    description: 'Email address of the employee to invite.',
    example: 'employee@example.com',
    format: 'email',
  })
  @EmailValidation()
  email!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendEmailDto {
  @ApiProperty({
    description:
      'The email address of the user to resend the verification email to',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}

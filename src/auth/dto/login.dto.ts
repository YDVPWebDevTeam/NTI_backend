import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email used to sign in.',
    example: 'student@nti.sk',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Account password.',
    example: 'StrongPass123!',
    minLength: 6,
    maxLength: 100,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;
}

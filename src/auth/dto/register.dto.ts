import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email for the new account.',
    example: 'new.student@nti.sk',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Display name of the new user.',
    example: 'Jan Novak',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @ApiProperty({
    description: 'Password for the new account.',
    example: 'StrongPass123!',
    minLength: 8,
    maxLength: 100,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}

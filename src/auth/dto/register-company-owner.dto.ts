import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterCompanyOwnerDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password too weak',
  })
  password!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SetStudentEmailDto {
  @ApiProperty({
    description: 'University email the student wants to verify.',
    example: 'jane.doe@ukf.sk',
  })
  @IsEmail()
  studentEmail!: string;
}

export class ConfirmStudentEmailDto {
  @ApiProperty({ description: 'Token from the verification email.' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class StudentEmailStateDto {
  @ApiProperty({ type: String, nullable: true, example: 'jane.doe@ukf.sk' })
  studentEmail!: string | null;

  @ApiProperty({ example: false })
  isStudentEmailConfirmed!: boolean;
}

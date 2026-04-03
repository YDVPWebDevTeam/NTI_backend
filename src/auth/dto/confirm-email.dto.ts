import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmEmailDto {
  @ApiProperty({
    description: 'Email verification token sent to the user email address.',
    example: '8757a38e14fafbb0baf5bdef2f043fe78757a38e14fafbb0baf5bdef2f043fe7',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

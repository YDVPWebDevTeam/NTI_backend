import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { EmailValidation } from '../../common/validation/email.validation';

export class CreateContactSubmissionDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'jane@example.com' })
  @EmailValidation()
  email!: string;

  @ApiProperty({ example: 'Becoming a mentor' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ example: 'I would like to apply as a mentor…' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({
    description:
      'Machine-readable intent key used to pre-filter submissions (e.g. "mentor").',
    example: 'mentor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  topic?: string;
}

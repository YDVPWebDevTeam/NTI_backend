import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateProgramBMentoringNoteDto {
  @ApiProperty({
    description: 'Mentoring note body.',
    example: 'Team should validate deployment risks before next milestone.',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  note!: string;
}

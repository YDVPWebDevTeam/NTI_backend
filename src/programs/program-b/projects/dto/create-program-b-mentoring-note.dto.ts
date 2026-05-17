import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProgramBMentoringNoteDto {
  @ApiProperty({
    description: 'Mentoring note body.',
    example: 'Team should validate deployment risks before next milestone.',
  })
  @IsString()
  @IsNotEmpty()
  note!: string;
}

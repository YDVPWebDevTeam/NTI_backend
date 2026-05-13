import { IsString, MinLength } from 'class-validator';

export class CreateMentorshipNoteDto {
  @IsString()
  @MinLength(1)
  content!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { MentorshipNoteAuthorDto } from './mentorship-note-author.dto';

export class ProgramAMentorshipNoteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: MentorshipNoteAuthorDto })
  author!: MentorshipNoteAuthorDto;
}

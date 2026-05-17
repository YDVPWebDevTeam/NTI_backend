import { ApiProperty } from '@nestjs/swagger';

export class MentorshipNoteAuthorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

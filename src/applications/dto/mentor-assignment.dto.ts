import { ApiProperty } from '@nestjs/swagger';

export class MentorAssignmentDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  mentorUserId!: string;

  @ApiProperty()
  assignedAt!: Date;

  @ApiProperty()
  assignedById!: string;
}

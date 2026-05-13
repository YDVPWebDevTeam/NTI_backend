import { IsUUID } from 'class-validator';

export class AssignMentorDto {
  @IsUUID()
  mentorUserId!: string;
}

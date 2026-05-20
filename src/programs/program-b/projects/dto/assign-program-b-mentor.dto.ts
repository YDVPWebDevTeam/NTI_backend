import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignProgramBMentorDto {
  @ApiProperty({
    description: 'Mentor user identifier.',
    format: 'uuid',
  })
  @IsUUID()
  mentorUserId!: string;
}

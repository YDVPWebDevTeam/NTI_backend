import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '../../../../generated/prisma/enums';

class ProgramAMentoredTeamMemberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;
}

export class ProgramAMentoredApplicationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiPropertyOptional()
  lifecycleStage?: string;

  @ApiProperty()
  teamId!: string;

  @ApiProperty()
  teamName!: string;

  @ApiProperty({ type: ProgramAMentoredTeamMemberDto, isArray: true })
  teamMembers!: ProgramAMentoredTeamMemberDto[];

  @ApiProperty()
  callId!: string;

  @ApiProperty()
  callTitle!: string;

  @ApiProperty()
  mentorUserId!: string;

  @ApiPropertyOptional()
  assignedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

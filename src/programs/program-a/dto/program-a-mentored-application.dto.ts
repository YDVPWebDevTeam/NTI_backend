import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '../../../../generated/prisma/enums';

class ProgramAMentoredTeamMemberDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  email?: string;
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

  @ApiPropertyOptional({ type: ProgramAMentoredTeamMemberDto, isArray: true })
  teamMembers?: ProgramAMentoredTeamMemberDto[];

  @ApiProperty()
  callId!: string;

  @ApiPropertyOptional()
  callTitle?: string;

  @ApiPropertyOptional()
  mentorUserId?: string;

  @ApiPropertyOptional()
  assignedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

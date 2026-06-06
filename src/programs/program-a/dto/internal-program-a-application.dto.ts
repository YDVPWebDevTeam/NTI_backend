import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApplicationStatus,
  CallStatus,
  ProgramType,
} from '../../../../generated/prisma/enums';

class InternalProgramATeamDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  leaderId!: string;
}

class InternalProgramACallDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({
    enum: ProgramType,
  })
  type!: ProgramType;

  @ApiProperty({
    enum: CallStatus,
  })
  status!: CallStatus;

  @ApiPropertyOptional({
    nullable: true,
  })
  opensAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  closesAt!: Date | null;
}

class InternalProgramAMentorAssignmentDto {
  @ApiPropertyOptional({
    nullable: true,
  })
  mentorUserId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  mentorAssignedAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  mentorAssignedById!: string | null;
}

class InternalProgramAEligibilitySignalSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  passed!: number;

  @ApiProperty()
  failed!: number;
}

class InternalProgramAEvaluationSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  evaluatedByCurrentUser!: boolean;
}

export class InternalProgramAApplicationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: ApplicationStatus,
  })
  status!: ApplicationStatus;

  @ApiPropertyOptional({
    nullable: true,
  })
  submittedAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  decidedAt!: Date | null;

  @ApiProperty()
  team!: InternalProgramATeamDto;

  @ApiProperty()
  call!: InternalProgramACallDto;

  @ApiProperty()
  mentorAssignment!: InternalProgramAMentorAssignmentDto;

  @ApiProperty()
  eligibilitySignalSummary!: InternalProgramAEligibilitySignalSummaryDto;

  @ApiProperty()
  evaluationSummary!: InternalProgramAEvaluationSummaryDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

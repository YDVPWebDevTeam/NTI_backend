import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProgramBMilestoneStatus,
  ProgramBPoDecision,
  ProgramBProjectStatus,
} from 'generated/prisma/enums';
import {
  ProgramBBacklogItemDto,
  ProgramBBacklogUserSummaryDto,
} from '../../backlog/dto/program-b-backlog-item.dto';
import { ProgramBProjectDocumentDto } from './program-b-project-document.dto';

export class ProgramBProjectTeamMemberDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;
}

export class ProgramBProjectTeamSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [ProgramBProjectTeamMemberDto] })
  members!: ProgramBProjectTeamMemberDto[];
}

export class ProgramBProjectMentorAssignmentDto {
  @ApiPropertyOptional({ format: 'uuid' })
  mentorUserId?: string;

  @ApiPropertyOptional({
    type: ProgramBBacklogUserSummaryDto,
  })
  mentor?: ProgramBBacklogUserSummaryDto;

  @ApiPropertyOptional()
  assignedAt?: Date;

  @ApiPropertyOptional({
    type: ProgramBBacklogUserSummaryDto,
  })
  assignedBy?: ProgramBBacklogUserSummaryDto;
}

export class ProgramBMilestoneDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  dueAt?: Date | null;

  @ApiProperty({ enum: ProgramBMilestoneStatus })
  status!: ProgramBMilestoneStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ProgramBMentoringNoteDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  note!: string;

  @ApiProperty({ type: ProgramBBacklogUserSummaryDto })
  author!: ProgramBBacklogUserSummaryDto;

  @ApiProperty()
  createdAt!: Date;
}

export class ProgramBPoReviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ProgramBPoDecision })
  decision!: ProgramBPoDecision;

  @ApiPropertyOptional()
  comment?: string | null;

  @ApiProperty({ type: ProgramBBacklogUserSummaryDto })
  author!: ProgramBBacklogUserSummaryDto;

  @ApiProperty()
  createdAt!: Date;
}

export class ProgramBProjectBacklogSummaryDto extends ProgramBBacklogItemDto {}

export class ProgramBProjectDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ProgramBProjectStatus })
  status!: ProgramBProjectStatus;

  @ApiProperty({ type: ProgramBProjectBacklogSummaryDto })
  backlogItem!: ProgramBProjectBacklogSummaryDto;

  @ApiProperty({ type: ProgramBProjectTeamSummaryDto })
  team!: ProgramBProjectTeamSummaryDto;

  @ApiProperty({ format: 'uuid' })
  productOwnerUserId!: string;

  @ApiProperty({ type: ProgramBBacklogUserSummaryDto })
  productOwner!: ProgramBBacklogUserSummaryDto;

  @ApiProperty({ type: ProgramBProjectMentorAssignmentDto })
  mentorAssignment!: ProgramBProjectMentorAssignmentDto;

  @ApiPropertyOptional()
  acceptedByCompanyAt?: Date;

  @ApiPropertyOptional()
  acceptedByNtiAt?: Date;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Reward per team member in EUR, set by the company or admin.',
    example: 800,
  })
  rewardPerMember?: number | null;

  @ApiProperty({ type: [ProgramBMilestoneDto] })
  milestones!: ProgramBMilestoneDto[];

  @ApiProperty({ type: [ProgramBMentoringNoteDto] })
  mentoringNotes!: ProgramBMentoringNoteDto[];

  @ApiProperty({ type: [ProgramBPoReviewDto] })
  poReviews!: ProgramBPoReviewDto[];

  @ApiProperty({ type: [ProgramBProjectDocumentDto] })
  documents!: ProgramBProjectDocumentDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

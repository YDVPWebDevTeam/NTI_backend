import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProgramBMilestoneStatus,
  ProgramBProjectStatus,
} from '../../../../../generated/prisma/enums';

class CompanyMentorSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;
}

class CompanyNextMilestoneSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  dueAt?: Date | null;

  @ApiProperty({ enum: ProgramBMilestoneStatus })
  status!: ProgramBMilestoneStatus;
}

export class CompanyProjectSummaryItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: ProgramBProjectStatus })
  status!: ProgramBProjectStatus;

  @ApiProperty()
  teamName!: string;

  @ApiPropertyOptional({ type: CompanyMentorSummaryDto, nullable: true })
  mentor?: CompanyMentorSummaryDto | null;

  @ApiPropertyOptional({ nullable: true })
  progressPercent?: number | null;

  @ApiPropertyOptional({ type: CompanyNextMilestoneSummaryDto, nullable: true })
  nextMilestone?: CompanyNextMilestoneSummaryDto | null;

  @ApiProperty()
  awaitingFinalAcceptance!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class CompanyProjectSummaryDto {
  @ApiProperty({ type: [CompanyProjectSummaryItemDto] })
  items!: CompanyProjectSummaryItemDto[];

  @ApiProperty()
  total!: number;
}

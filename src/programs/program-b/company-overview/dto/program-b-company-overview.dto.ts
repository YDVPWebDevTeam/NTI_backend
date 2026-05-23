import { ApiProperty } from '@nestjs/swagger';
import {
  BacklogItemStatus,
  OrganizationStatus,
  ProgramBProjectStatus,
  ProgramBTeamApplicationStatus,
} from '../../../../../generated/prisma/enums';

export enum ProgramBCompanyPendingActionCode {
  ASSIGN_PRODUCT_OWNER = 'ASSIGN_PRODUCT_OWNER',
  REVIEW_CANDIDATES = 'REVIEW_CANDIDATES',
  FINAL_ACCEPTANCE = 'FINAL_ACCEPTANCE',
  OVERDUE_MILESTONE = 'OVERDUE_MILESTONE',
}

class ProgramBCompanyOrganizationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: OrganizationStatus })
  status!: OrganizationStatus;
}

class ProgramBCompanyBacklogCountsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  draft!: number;

  @ApiProperty()
  published!: number;

  @ApiProperty()
  archived!: number;

  @ApiProperty()
  withoutProductOwner!: number;
}

class ProgramBCompanyProjectCountsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  awaitingFinalAcceptance!: number;

  @ApiProperty()
  overdueMilestones!: number;
}

class ProgramBCompanyCandidateCountsDto {
  @ApiProperty()
  submitted!: number;

  @ApiProperty()
  shortlisted!: number;

  @ApiProperty()
  accepted!: number;

  @ApiProperty()
  rejected!: number;

  @ApiProperty()
  pendingReview!: number;
}

class ProgramBCompanyPendingActionDto {
  @ApiProperty({ enum: ProgramBCompanyPendingActionCode })
  code!: ProgramBCompanyPendingActionCode;

  @ApiProperty()
  count!: number;
}

export class ProgramBCompanyOverviewDto {
  @ApiProperty({ type: ProgramBCompanyOrganizationDto })
  organization!: ProgramBCompanyOrganizationDto;

  @ApiProperty({ type: ProgramBCompanyBacklogCountsDto })
  backlog!: ProgramBCompanyBacklogCountsDto;

  @ApiProperty({ type: ProgramBCompanyProjectCountsDto })
  projects!: ProgramBCompanyProjectCountsDto;

  @ApiProperty({ type: ProgramBCompanyCandidateCountsDto })
  candidates!: ProgramBCompanyCandidateCountsDto;

  @ApiProperty({ type: [ProgramBCompanyPendingActionDto] })
  pendingActions!: ProgramBCompanyPendingActionDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export const ACTIVE_PROJECT_STATUSES: ProgramBProjectStatus[] = [
  ProgramBProjectStatus.ACTIVE,
  ProgramBProjectStatus.BLOCKED,
];

export const COMPLETED_PROJECT_STATUSES: ProgramBProjectStatus[] = [
  ProgramBProjectStatus.COMPLETED,
  ProgramBProjectStatus.CLOSED,
];

export const OPEN_BACKLOG_STATUSES: BacklogItemStatus[] = [
  BacklogItemStatus.DRAFT,
  BacklogItemStatus.PUBLISHED,
  BacklogItemStatus.IN_PAIRING,
  BacklogItemStatus.ASSIGNED,
  BacklogItemStatus.IN_REALIZATION,
];

export const REVIEWABLE_CANDIDATE_STATUSES: ProgramBTeamApplicationStatus[] = [
  ProgramBTeamApplicationStatus.SUBMITTED,
];

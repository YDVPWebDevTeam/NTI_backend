import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BacklogItemStatus } from 'generated/prisma/enums';
import { ProgramBBacklogDocumentDto } from './program-b-backlog-document.dto';

export class ProgramBBacklogOrganizationSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class ProgramBBacklogUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

export class ProgramBBacklogItemDto {
  @ApiProperty({
    description: 'Backlog item identifier.',
    format: 'uuid',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Backlog item title.',
    nullable: true,
    example: 'Internal knowledge base for onboarding',
  })
  title!: string | null;

  @ApiPropertyOptional({
    description: 'Backlog item description.',
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Allocated budget for the backlog item.',
    nullable: true,
    example: 2500,
  })
  budget!: number | null;

  @ApiPropertyOptional({
    description: 'Expected outcomes for the backlog item.',
    nullable: true,
  })
  expectedOutcomes!: string | null;

  @ApiPropertyOptional({
    description: 'Product owner user id.',
    format: 'uuid',
    nullable: true,
  })
  productOwnerUserId!: string | null;

  @ApiProperty({
    description: 'Owning organization id.',
    format: 'uuid',
  })
  organizationId!: string;

  @ApiPropertyOptional({
    type: ProgramBBacklogOrganizationSummaryDto,
    nullable: true,
  })
  organization?: ProgramBBacklogOrganizationSummaryDto | null;

  @ApiProperty({
    description: 'Backlog lifecycle status.',
    enum: BacklogItemStatus,
  })
  status!: BacklogItemStatus;

  @ApiPropertyOptional({
    type: ProgramBBacklogUserSummaryDto,
    nullable: true,
  })
  productOwner?: ProgramBBacklogUserSummaryDto | null;

  @ApiProperty({
    type: [ProgramBBacklogDocumentDto],
  })
  documents!: ProgramBBacklogDocumentDto[];

  @ApiProperty({
    description: 'When the backlog item was created.',
    type: String,
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the backlog item was last updated.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: Date;
}

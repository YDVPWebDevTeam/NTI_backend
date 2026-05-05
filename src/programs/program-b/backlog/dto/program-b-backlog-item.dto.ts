import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BacklogItemStatus } from 'generated/prisma/enums';

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

  @ApiProperty({
    description: 'Backlog lifecycle status.',
    enum: BacklogItemStatus,
  })
  status!: BacklogItemStatus;

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

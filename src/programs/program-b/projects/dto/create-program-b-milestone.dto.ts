import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ProgramBMilestoneStatus } from 'generated/prisma/enums';

export class CreateProgramBMilestoneDto {
  @ApiProperty({
    description: 'Milestone title.',
    example: 'Prototype delivery',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    description: 'Milestone description.',
    example: 'Deliver a clickable prototype for PO review.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Milestone due date.',
    example: '2026-06-15T12:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @ApiPropertyOptional({
    description: 'Milestone status.',
    enum: ProgramBMilestoneStatus,
    example: ProgramBMilestoneStatus.PLANNED,
  })
  @IsOptional()
  @IsEnum(ProgramBMilestoneStatus)
  status?: ProgramBMilestoneStatus;
}

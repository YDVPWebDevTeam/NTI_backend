import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProgramBMilestoneStatus } from 'generated/prisma/enums';

export class CreateProgramBMilestoneDto {
  @ApiProperty({
    description: 'Milestone title.',
    example: 'Prototype delivery',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    description: 'Milestone description.',
    example: 'Deliver a clickable prototype for PO review.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
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

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ProgramAMilestoneStatus } from '../../../generated/prisma/enums';

export class UpdateProgramAMilestoneDto {
  @ApiPropertyOptional({
    example: 'Build MVP prototype',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({
    example: 'Prepare a working MVP version for internal demo.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: '2026-06-30T23:59:59.000Z',
  })
  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @ApiPropertyOptional({
    enum: ProgramAMilestoneStatus,
    example: ProgramAMilestoneStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(ProgramAMilestoneStatus)
  status?: ProgramAMilestoneStatus;

  @ApiPropertyOptional({
    example: 'Prototype UI is ready, backend integration is in progress.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  progressNote?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsIn, IsOptional, IsString } from 'class-validator';
import { ProgramType } from '../../../generated/prisma/enums';
import { SORT_ORDER_VALUES, type SortOrder } from '../../common/pagination';
import { APPLICATIONS_REPORT_SORT_VALUES } from './applications-report-query.dto';
import { PROGRAM_B_REPORT_SORT_VALUES } from './program-b-report-query.dto';
import {
  REPORT_DATASET_VALUES,
  REPORT_FORMAT_VALUES,
  type ReportDataset,
  type ReportFormat,
} from '../reports.constants';

export class ReportExportQueryDto {
  static readonly SORT_VALUES = [
    ...new Set([
      ...APPLICATIONS_REPORT_SORT_VALUES,
      ...PROGRAM_B_REPORT_SORT_VALUES,
    ]),
  ] as const;

  @ApiProperty({ enum: REPORT_DATASET_VALUES })
  @IsEnum(REPORT_DATASET_VALUES)
  dataset!: ReportDataset;

  @ApiProperty({ enum: REPORT_FORMAT_VALUES })
  @IsEnum(REPORT_FORMAT_VALUES)
  format!: ReportFormat;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({ enum: ProgramType })
  @IsOptional()
  @IsEnum(ProgramType)
  programType?: ProgramType;

  @ApiPropertyOptional({
    description:
      'Dataset-specific status filter. Use ApplicationStatus values for applications and ProgramBTeamApplicationStatus values for program-b.',
    example: 'SUBMITTED',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    enum: ReportExportQueryDto.SORT_VALUES,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(ReportExportQueryDto.SORT_VALUES)
  sort: (typeof ReportExportQueryDto.SORT_VALUES)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: SORT_ORDER_VALUES, default: 'desc' })
  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  order: SortOrder = 'desc';
}

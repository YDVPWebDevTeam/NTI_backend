import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsISO8601, IsOptional } from 'class-validator';
import { ProgramBTeamApplicationStatus } from '../../../generated/prisma/enums';
import {
  PaginationQueryDto,
  SORT_ORDER_VALUES,
  type SortOrder,
} from '../../common/pagination';

export const PROGRAM_B_REPORT_SORT_VALUES = [
  'createdAt',
  'submittedAt',
  'status',
] as const;

export type ProgramBReportSortField =
  (typeof PROGRAM_B_REPORT_SORT_VALUES)[number];

export class ProgramBReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({ enum: ProgramBTeamApplicationStatus })
  @IsOptional()
  @IsEnum(ProgramBTeamApplicationStatus)
  status?: ProgramBTeamApplicationStatus;

  @ApiPropertyOptional({
    enum: PROGRAM_B_REPORT_SORT_VALUES,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(PROGRAM_B_REPORT_SORT_VALUES)
  sort: ProgramBReportSortField = 'createdAt';

  @ApiPropertyOptional({ enum: SORT_ORDER_VALUES, default: 'desc' })
  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  order: SortOrder = 'desc';
}

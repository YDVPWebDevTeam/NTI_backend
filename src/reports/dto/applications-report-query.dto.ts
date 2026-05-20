import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsISO8601, IsOptional } from 'class-validator';
import {
  ApplicationStatus,
  ProgramType,
} from '../../../generated/prisma/enums';
import {
  PaginationQueryDto,
  SORT_ORDER_VALUES,
  type SortOrder,
} from '../../common/pagination';

export const APPLICATIONS_REPORT_SORT_VALUES = [
  'createdAt',
  'submittedAt',
  'decidedAt',
  'status',
] as const;

export type ApplicationsReportSortField =
  (typeof APPLICATIONS_REPORT_SORT_VALUES)[number];

export class ApplicationsReportQueryDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    enum: APPLICATIONS_REPORT_SORT_VALUES,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(APPLICATIONS_REPORT_SORT_VALUES)
  sort: ApplicationsReportSortField = 'createdAt';

  @ApiPropertyOptional({ enum: SORT_ORDER_VALUES, default: 'desc' })
  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  order: SortOrder = 'desc';
}

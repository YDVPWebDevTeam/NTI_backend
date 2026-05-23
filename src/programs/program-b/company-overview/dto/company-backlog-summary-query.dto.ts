import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { BacklogItemStatus } from '../../../../../generated/prisma/enums';
import { toOptionalNumber } from '../../../../common/validation/to-optional-number.transformer';

export const COMPANY_BACKLOG_SUMMARY_SORT_VALUES = [
  'updatedAt',
  'createdAt',
  'budget',
  'title',
] as const;

export class CompanyBacklogSummaryQueryDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 5;

  @IsOptional()
  @IsEnum(BacklogItemStatus)
  status?: BacklogItemStatus;

  @IsOptional()
  @IsIn(COMPANY_BACKLOG_SUMMARY_SORT_VALUES)
  sort: (typeof COMPANY_BACKLOG_SUMMARY_SORT_VALUES)[number] = 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}

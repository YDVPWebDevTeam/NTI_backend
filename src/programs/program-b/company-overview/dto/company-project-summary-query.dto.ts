import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ProgramBProjectStatus } from '../../../../../generated/prisma/enums';
import { toOptionalNumber } from '../../../../common/validation/to-optional-number.transformer';

export const COMPANY_PROJECT_SUMMARY_SORT_VALUES = [
  'updatedAt',
  'createdAt',
  'title',
  'teamName',
] as const;

export class CompanyProjectSummaryQueryDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 5;

  @IsOptional()
  @IsEnum(ProgramBProjectStatus)
  status?: ProgramBProjectStatus;

  @IsOptional()
  @IsIn(COMPANY_PROJECT_SUMMARY_SORT_VALUES)
  sort: (typeof COMPANY_PROJECT_SUMMARY_SORT_VALUES)[number] = 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}

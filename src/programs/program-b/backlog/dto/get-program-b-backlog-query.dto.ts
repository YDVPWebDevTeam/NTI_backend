import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { BacklogItemStatus } from 'generated/prisma/enums';
import {
  PaginationQueryDto,
  SORT_ORDER_VALUES,
  type SortOrder,
} from '../../../../common/pagination';

export const BACKLOG_SORT_VALUES = [
  'updatedAt',
  'createdAt',
  'budget',
  'title',
] as const;

export class GetProgramBBacklogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(BacklogItemStatus)
  status?: BacklogItemStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @IsOptional()
  @IsIn(BACKLOG_SORT_VALUES)
  sort: (typeof BACKLOG_SORT_VALUES)[number] = 'updatedAt';

  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  order: SortOrder = 'desc';
}

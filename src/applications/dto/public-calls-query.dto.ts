import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { ProgramType } from '../../../generated/prisma/enums';
import {
  PaginationQueryDto,
  SORT_ORDER_VALUES,
  type SortOrder,
} from '../../common/pagination';

export const PUBLIC_CALL_SORT_VALUES = [
  'closesAt',
  'opensAt',
  'createdAt',
] as const;

export class PublicCallsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ProgramType)
  type?: ProgramType;

  @IsOptional()
  @IsIn(PUBLIC_CALL_SORT_VALUES)
  sort: (typeof PUBLIC_CALL_SORT_VALUES)[number] = 'closesAt';

  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  order: SortOrder = 'asc';
}

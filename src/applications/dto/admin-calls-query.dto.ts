import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { CallStatus, ProgramType } from '../../../generated/prisma/enums';
import {
  PaginationQueryDto,
  SORT_ORDER_VALUES,
  type SortOrder,
} from '../../common/pagination';

export const ADMIN_CALL_SORT_VALUES = [
  'createdAt',
  'updatedAt',
  'opensAt',
  'closesAt',
  'title',
] as const;

export type AdminCallSortField = (typeof ADMIN_CALL_SORT_VALUES)[number];

export class AdminCallsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProgramType })
  @IsOptional()
  @IsEnum(ProgramType)
  type?: ProgramType;

  @ApiPropertyOptional({ enum: CallStatus })
  @IsOptional()
  @IsEnum(CallStatus)
  status?: CallStatus;

  @ApiPropertyOptional({ enum: ADMIN_CALL_SORT_VALUES, default: 'createdAt' })
  @IsOptional()
  @IsIn(ADMIN_CALL_SORT_VALUES)
  sort: AdminCallSortField = 'createdAt';

  @ApiPropertyOptional({ enum: SORT_ORDER_VALUES, default: 'desc' })
  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  order: SortOrder = 'desc';
}

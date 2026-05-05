import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BacklogItemStatus } from 'generated/prisma/enums';

const BACKLOG_SORT_VALUES = [
  'updatedAt',
  'createdAt',
  'budget',
  'title',
] as const;
const SORT_ORDER_VALUES = ['asc', 'desc'] as const;

export class GetProgramBBacklogQueryDto {
  @IsOptional()
  @IsEnum(BacklogItemStatus)
  status?: BacklogItemStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsIn(BACKLOG_SORT_VALUES)
  sort: (typeof BACKLOG_SORT_VALUES)[number] = 'updatedAt';

  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  order: (typeof SORT_ORDER_VALUES)[number] = 'desc';
}

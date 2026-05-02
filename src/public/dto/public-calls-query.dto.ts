import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const PUBLIC_CALL_SORT_VALUES = [
  'closesAt:asc',
  'closesAt:desc',
  'opensAt:asc',
  'opensAt:desc',
  'createdAt:asc',
  'createdAt:desc',
] as const;

export class PublicCallsQueryDto {
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
  @IsIn(PUBLIC_CALL_SORT_VALUES)
  sort: (typeof PUBLIC_CALL_SORT_VALUES)[number] = 'closesAt:asc';
}

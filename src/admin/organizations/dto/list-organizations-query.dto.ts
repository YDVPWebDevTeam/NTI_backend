import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrganizationStatus } from '../../../../generated/prisma/enums';
import {
  PaginationQueryDto,
  SORT_ORDER_VALUES,
  type SortOrder,
} from '../../../common/pagination';

export const ORG_SORT_VALUES = ['createdAt', 'name', 'status'] as const;
export type OrgSortField = (typeof ORG_SORT_VALUES)[number];

export class ListOrganizationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by name or ICO.',
    example: 'Acme',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @ApiPropertyOptional({ example: 'IT' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(120)
  sector?: string;

  @ApiPropertyOptional({ enum: ORG_SORT_VALUES, default: 'createdAt' })
  @IsOptional()
  @IsIn(ORG_SORT_VALUES)
  sort: OrgSortField = 'createdAt';

  @ApiPropertyOptional({ enum: SORT_ORDER_VALUES, default: 'desc' })
  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  order: SortOrder = 'desc';
}

import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { InvitationStatus } from 'generated/prisma/enums';
import {
  PaginationQueryDto,
  SORT_ORDER_VALUES,
  type SortOrder,
} from '../../common/pagination';

export const ORGANIZATION_INVITE_SORT_VALUES = ['createdAt'] as const;

export class GetOrganizationInvitesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @IsOptional()
  @IsIn(ORGANIZATION_INVITE_SORT_VALUES)
  sort: (typeof ORGANIZATION_INVITE_SORT_VALUES)[number] = 'createdAt';

  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  order: SortOrder = 'desc';
}

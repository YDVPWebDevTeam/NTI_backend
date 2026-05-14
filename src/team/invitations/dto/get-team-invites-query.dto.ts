import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { InvitationStatus } from '../../../../generated/prisma/enums';
import {
  PaginationQueryDto,
  SORT_ORDER_VALUES,
  type SortOrder,
} from '../../../common/pagination';

export const TEAM_INVITE_SORT_VALUES = ['createdAt'] as const;

export class GetTeamInvitesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @IsOptional()
  @IsIn(TEAM_INVITE_SORT_VALUES)
  sort: (typeof TEAM_INVITE_SORT_VALUES)[number] = 'createdAt';

  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  order: SortOrder = 'desc';
}

import { ApiProperty } from '@nestjs/swagger';
import { PaginatedMetaDto } from '../../../common/pagination';
import { TeamInviteItemDto } from './team-invite-item.dto';

export class GetTeamInvitesResponseDto {
  @ApiProperty({ type: [TeamInviteItemDto] })
  data!: TeamInviteItemDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta!: PaginatedMetaDto;
}

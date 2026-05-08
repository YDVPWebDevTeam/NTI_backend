import { ApiProperty } from '@nestjs/swagger';
import { PaginatedMetaDto } from '../../common/pagination';
import { OrganizationInviteItemDto } from './organization-invite-item.dto';

export class GetOrganizationInvitesResponseDto {
  @ApiProperty({ type: [OrganizationInviteItemDto] })
  data!: OrganizationInviteItemDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta!: PaginatedMetaDto;
}

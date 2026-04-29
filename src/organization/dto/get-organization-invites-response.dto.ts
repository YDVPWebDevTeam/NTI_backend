import { ApiProperty } from '@nestjs/swagger';
import { GetOrganizationInvitesMetaDto } from './get-organization-invites-meta.dto';
import { OrganizationInviteItemDto } from './organization-invite-item.dto';

export class GetOrganizationInvitesResponseDto {
  @ApiProperty({ type: [OrganizationInviteItemDto] })
  data!: OrganizationInviteItemDto[];

  @ApiProperty({ type: GetOrganizationInvitesMetaDto })
  meta!: GetOrganizationInvitesMetaDto;
}

import { ApiProperty } from '@nestjs/swagger';
import { AdminListMetaDto } from '../../dto/admin-list-meta.dto';
import { AdminOrganizationRowDto } from './admin-organization-row.dto';

export class ListOrganizationsResponseDto {
  @ApiProperty({ type: [AdminOrganizationRowDto] })
  data!: AdminOrganizationRowDto[];

  @ApiProperty({ type: AdminListMetaDto })
  meta!: AdminListMetaDto;
}

import { ApiProperty } from '@nestjs/swagger';
import { AdminListMetaDto } from '../../dto/admin-list-meta.dto';
import { AdminUserRowDto } from './admin-user-row.dto';

export class ListUsersResponseDto {
  @ApiProperty({ type: [AdminUserRowDto] })
  data!: AdminUserRowDto[];

  @ApiProperty({ type: AdminListMetaDto })
  meta!: AdminListMetaDto;
}

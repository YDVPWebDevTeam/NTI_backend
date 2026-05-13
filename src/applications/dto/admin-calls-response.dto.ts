import { ApiProperty } from '@nestjs/swagger';
import { AdminListMetaDto } from '../../admin/dto/admin-list-meta.dto';
import { AdminCallDto } from './admin-call.dto';

export class AdminCallsResponseDto {
  @ApiProperty({ type: [AdminCallDto] })
  data!: AdminCallDto[];

  @ApiProperty({ type: AdminListMetaDto })
  meta!: AdminListMetaDto;
}

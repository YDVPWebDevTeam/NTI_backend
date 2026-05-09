import { ApiProperty } from '@nestjs/swagger';
import { PaginatedMetaDto } from '../../../../common/pagination';
import { ProgramBBacklogItemDto } from './program-b-backlog-item.dto';

export class GetProgramBBacklogResponseDto {
  @ApiProperty({ type: [ProgramBBacklogItemDto] })
  data!: ProgramBBacklogItemDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta!: PaginatedMetaDto;
}

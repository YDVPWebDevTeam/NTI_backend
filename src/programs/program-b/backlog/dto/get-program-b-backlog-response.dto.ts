import { ApiProperty } from '@nestjs/swagger';
import { ProgramBBacklogItemDto } from './program-b-backlog-item.dto';
import { ProgramBBacklogMetaDto } from './program-b-backlog-meta.dto';

export class GetProgramBBacklogResponseDto {
  @ApiProperty({ type: [ProgramBBacklogItemDto] })
  data!: ProgramBBacklogItemDto[];

  @ApiProperty({ type: ProgramBBacklogMetaDto })
  meta!: ProgramBBacklogMetaDto;
}

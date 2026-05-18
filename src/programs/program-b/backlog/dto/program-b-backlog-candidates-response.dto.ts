import { ApiProperty } from '@nestjs/swagger';
import { ProgramBTeamApplicationResponseDto } from '../../team-application/dto/team-application-response.dto';

export class ProgramBBacklogCandidatesResponseDto {
  @ApiProperty({ type: [ProgramBTeamApplicationResponseDto] })
  data!: ProgramBTeamApplicationResponseDto[];
}

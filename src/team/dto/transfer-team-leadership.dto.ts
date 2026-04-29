import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferTeamLeadershipDto {
  @ApiProperty({
    description:
      'Identifier of the current team member who will become leader.',
    format: 'uuid',
  })
  @IsUUID()
  newLeaderId!: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class TeamSummaryResponseDto {
  @ApiProperty({
    description: 'Team identifier.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Identifier of the current team leader.',
    format: 'uuid',
  })
  leaderId!: string;

  @ApiProperty({
    description: 'Last update timestamp for the team.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: Date;
}

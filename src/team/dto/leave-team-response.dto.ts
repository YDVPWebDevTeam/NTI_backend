import { ApiProperty } from '@nestjs/swagger';

export class LeaveTeamResponseDto {
  @ApiProperty({
    description: 'Identifier of the team that was left.',
    format: 'uuid',
  })
  teamId!: string;

  @ApiProperty({
    description: 'Identifier of the user who left the team.',
    format: 'uuid',
  })
  userId!: string;

  @ApiProperty({
    description: 'Whether the user left the team successfully.',
    example: true,
  })
  left!: boolean;
}

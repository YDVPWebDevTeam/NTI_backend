import { ApiProperty } from '@nestjs/swagger';

export class RemoveTeamMemberResponseDto {
  @ApiProperty({
    description: 'Identifier of the team from which the member was removed.',
    format: 'uuid',
  })
  teamId!: string;

  @ApiProperty({
    description: 'Identifier of the removed member.',
    format: 'uuid',
  })
  memberId!: string;

  @ApiProperty({
    description: 'Whether the member was removed successfully.',
    example: true,
  })
  removed!: boolean;
}

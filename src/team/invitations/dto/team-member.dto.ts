import { ApiProperty } from '@nestjs/swagger';
import type { TeamMember } from '../../../../generated/prisma/client';

export class TeamMemberDto implements Pick<TeamMember, 'userId' | 'teamId'> {
  @ApiProperty({
    description: 'Identifier of the user added to the team.',
    example: '1f0d8f2a-7f8d-4b6e-a6ed-8ce4db6f9c91',
  })
  userId!: string;

  @ApiProperty({
    description: 'Identifier of the team.',
    example: '3f7f6e8b-9a5e-4f8e-8f26-0d3a6f4a7e1c',
  })
  teamId!: string;
}

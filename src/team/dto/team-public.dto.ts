import { ApiProperty } from '@nestjs/swagger';
import type { TeamPublicView } from '../team.repository';

export class TeamPublicDto implements TeamPublicView {
  @ApiProperty({
    description: 'Team identifier.',
    example: '3f7f6e8b-9a5e-4f8e-8f26-0d3a6f4a7e1c',
  })
  id!: string;

  @ApiProperty({ description: 'Team name.', example: 'Alpha Team' })
  name!: string;

  @ApiProperty({
    description: 'Identifier of the team leader.',
    example: '1f0d8f2a-7f8d-4b6e-a6ed-8ce4db6f9c91',
  })
  leaderId!: string;

  @ApiProperty({
    description: 'Timestamp when the team was created.',
    example: '2026-04-07T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Timestamp when the team was last updated.',
    example: '2026-04-07T12:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Timestamp when the team was locked, if any.',
    nullable: true,
    example: null,
  })
  lockedAt!: Date | null;

  @ApiProperty({
    description: 'Timestamp when the team was archived, if any.',
    nullable: true,
    example: null,
  })
  archivedAt!: Date | null;
}

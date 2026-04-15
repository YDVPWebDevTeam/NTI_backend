import { ApiProperty } from '@nestjs/swagger';
import { TeamPublicDto } from './team-public.dto';
import { TeamMemberWithUserDto } from './team-member-with-user.dto';
import { TeamUserDto } from './team-user.dto';

export class TeamDetailDto extends TeamPublicDto {
  @ApiProperty({
    type: TeamUserDto,
    description: 'Safe representation of the team leader.',
  })
  leader!: TeamUserDto;

  @ApiProperty({
    type: TeamMemberWithUserDto,
    isArray: true,
    description: 'Current team members.',
  })
  members!: TeamMemberWithUserDto[];
}

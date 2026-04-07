import { ApiProperty } from '@nestjs/swagger';
import { TeamMemberDto } from '../invitations/dto/team-member.dto';
import { TeamUserDto } from './team-user.dto';

export class TeamMemberWithUserDto extends TeamMemberDto {
  @ApiProperty({
    type: TeamUserDto,
    description: 'Safe public representation of the member user.',
  })
  user!: TeamUserDto;
}

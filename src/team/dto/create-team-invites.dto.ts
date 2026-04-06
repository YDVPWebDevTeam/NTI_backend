import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
} from 'class-validator';

const MIN_TEAM_INVITES_PER_REQUEST = 2;
const MAX_TEAM_INVITES_PER_REQUEST = 100;
const normalizeInviteEmail = (email: string) => email.trim().toLowerCase();

export class CreateTeamInvitesDto {
  @ApiProperty({
    description: 'Email addresses to invite to the team.',
    example: ['a@example.com', 'b@example.com'],
    minItems: MIN_TEAM_INVITES_PER_REQUEST,
    maxItems: MAX_TEAM_INVITES_PER_REQUEST,
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(MIN_TEAM_INVITES_PER_REQUEST)
  @ArrayMaxSize(MAX_TEAM_INVITES_PER_REQUEST)
  @ArrayUnique(normalizeInviteEmail)
  @IsEmail({}, { each: true })
  emails!: string[];
}

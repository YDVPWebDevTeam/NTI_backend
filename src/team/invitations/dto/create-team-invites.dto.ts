import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { EmailValidation } from '../../../common/validation/email.validation';

const MIN_TEAM_INVITES_PER_REQUEST = 1;
const MAX_TEAM_INVITES_PER_REQUEST = 100;

export class CreateTeamInvitesDto {
  @ApiProperty({
    description: 'Email addresses to invite to the team.',
    example: ['a@example.com', 'b@example.com'],
    minItems: MIN_TEAM_INVITES_PER_REQUEST,
    maxItems: MAX_TEAM_INVITES_PER_REQUEST,
    type: [String],
  })
  @ArrayMinSize(MIN_TEAM_INVITES_PER_REQUEST)
  @ArrayMaxSize(MAX_TEAM_INVITES_PER_REQUEST)
  @EmailValidation({ array: true, unique: true })
  emails!: string[];
}

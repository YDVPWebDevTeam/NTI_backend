import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsString,
  MinLength,
} from 'class-validator';
import { EmailValidation } from '../../common/validation/email.validation';

const MIN_TEAM_INVITES_PER_REQUEST = 2;
const MAX_TEAM_INVITES_PER_REQUEST = 100;

export class CreateTeamWithInvitesDto {
  @ApiProperty({
    example: 'Alpha Team',
    description: 'Team name.',
  })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({
    description: 'Email addresses to invite to the team.',
    example: ['a@nti.sk', 'b@nti.sk'],
    minItems: MIN_TEAM_INVITES_PER_REQUEST,
    maxItems: MAX_TEAM_INVITES_PER_REQUEST,
    type: [String],
  })
  @ArrayMinSize(MIN_TEAM_INVITES_PER_REQUEST)
  @ArrayMaxSize(MAX_TEAM_INVITES_PER_REQUEST)
  @EmailValidation({ array: true, unique: true })
  emails!: string[];
}

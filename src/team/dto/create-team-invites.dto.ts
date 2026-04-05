import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEmail } from 'class-validator';

export class CreateTeamInvitesDto {
  @ApiProperty({
    description: 'Email addresses to invite to the team.',
    example: ['a@example.com', 'b@example.com'],
    minItems: 2,
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsEmail({}, { each: true })
  emails!: string[];
}

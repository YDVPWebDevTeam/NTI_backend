import { ApiProperty } from '@nestjs/swagger';
import { CreatedInvitationDto } from './created-invitation.dto';

export class CreateTeamInvitesResponseDto {
  @ApiProperty({
    description: 'Number of invitations that were created.',
    example: 2,
  })
  createdCount!: number;

  @ApiProperty({
    description:
      'Created invitations with identifiers for follow-up actions like revoke.',
    type: CreatedInvitationDto,
    isArray: true,
  })
  invitations!: CreatedInvitationDto[];
}

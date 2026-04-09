import { ApiProperty } from '@nestjs/swagger';

export class InviteValidationResponseDto {
  @ApiProperty({
    description: 'Email address bound to the invitation token.',
    example: 'student@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Name of the team the invited user will join.',
    example: 'Alpha Team',
  })
  teamName!: string;
}

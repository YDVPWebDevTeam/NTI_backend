import { ApiProperty } from '@nestjs/swagger';

export class CreatedInvitationDto {
  @ApiProperty({
    description: 'Invitation identifier.',
    example: '9c0ec8cb-4665-4504-ac02-b58a448f1b18',
  })
  id!: string;

  @ApiProperty({
    description: 'Invitation recipient email.',
    example: 'student@nti.sk',
  })
  email!: string;
}

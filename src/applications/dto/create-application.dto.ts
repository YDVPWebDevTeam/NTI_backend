import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    description: 'Target call identifier to which the team applies.',
    example: '87dcb0e9-2f7e-4ab5-b014-d2f1204bc138',
  })
  @IsUUID()
  callId!: string;

  @ApiProperty({
    description: 'Team identifier submitting the application.',
    example: '5db65d84-f9ae-4221-a4be-15e65e6d4d3c',
  })
  @IsUUID()
  teamId!: string;
}

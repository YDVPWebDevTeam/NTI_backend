import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    example: 'Alpha Team',
    description: 'Team name.',
  })
  @IsString()
  @MinLength(1)
  name!: string;
}

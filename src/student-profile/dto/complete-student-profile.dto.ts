import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteStudentProfileDto {
  @ApiProperty({
    example: 'Alpha Team',
    description: 'Personal team name to create or apply on profile completion.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  teamName!: string;
}

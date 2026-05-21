import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export type ApplicationIdeaOverviewSectionValue = {
  problem: string;
  solution: string;
  targetUsers: string;
  valueProposition: string;
};

export class ApplicationIdeaOverviewSectionValueDto {
  @ApiProperty({
    description: 'Problem the team is solving.',
    example: 'Students struggle to find grants',
  })
  @IsString()
  @IsNotEmpty()
  problem!: string;

  @ApiProperty({
    description: 'Proposed solution for the problem.',
    example: 'A guided application flow',
  })
  @IsString()
  @IsNotEmpty()
  solution!: string;

  @ApiProperty({
    description: 'Primary user segment.',
    example: 'Student teams',
  })
  @IsString()
  @IsNotEmpty()
  targetUsers!: string;

  @ApiProperty({
    description: 'Core value proposition.',
    example: 'Faster and clearer application submission',
  })
  @IsString()
  @IsNotEmpty()
  valueProposition!: string;
}

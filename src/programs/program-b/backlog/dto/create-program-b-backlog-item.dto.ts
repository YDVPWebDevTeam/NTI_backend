import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProgramBBacklogItemDto {
  @ApiPropertyOptional({
    description: 'Backlog item title.',
    example: 'Internal knowledge base for onboarding',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Backlog item description.',
    example: 'Build a searchable onboarding portal for new hires.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Budget allocated for the backlog item.',
    example: 2500,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    description: 'Expected outcomes of the backlog item.',
    example: 'Faster onboarding and reduced recurring support requests.',
  })
  @IsOptional()
  @IsString()
  expectedOutcomes?: string;

  @ApiPropertyOptional({
    description: 'User id of the product owner for this backlog item.',
    format: 'uuid',
    example: 'd5af8ff2-69e9-4f31-bd0b-a2a226c9ffc5',
  })
  @IsOptional()
  @IsUUID()
  productOwnerUserId?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProgramBCandidateDecisionDto {
  @ApiPropertyOptional({
    description: 'Optional rationale for the shortlist or decision action.',
    example: 'Strong domain match and delivery readiness.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

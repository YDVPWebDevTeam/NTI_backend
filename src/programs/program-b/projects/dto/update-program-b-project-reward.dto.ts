import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateProgramBProjectRewardDto {
  @ApiPropertyOptional({
    description: 'Reward amount per team member in EUR.',
    nullable: true,
    example: 800,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  rewardPerMember?: number | null;
}

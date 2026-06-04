import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateApplicationGrantBudgetDto {
  @ApiPropertyOptional({
    description: 'Approved grant budget for the Program A project in EUR.',
    nullable: true,
    example: 5000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  grantBudget?: number | null;
}

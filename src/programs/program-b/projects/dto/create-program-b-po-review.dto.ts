import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProgramBPoDecision } from 'generated/prisma/enums';

export class CreateProgramBPoReviewDto {
  @ApiProperty({
    description: 'Product owner review decision.',
    enum: ProgramBPoDecision,
    example: ProgramBPoDecision.APPROVED,
  })
  @IsEnum(ProgramBPoDecision)
  decision!: ProgramBPoDecision;

  @ApiPropertyOptional({
    description: 'Optional product owner review comment.',
    example: 'Approved for final NTI acceptance.',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { EvaluationRecommendation } from '../../../generated/prisma/enums';

export class ApplicationEvaluationScoreDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  evaluationId!: string;

  @ApiProperty({ example: 'TECHNICAL_QUALITY' })
  criterionCode!: string;

  @ApiProperty({ example: 80 })
  score!: string;

  @ApiProperty({ nullable: true })
  comment!: string | null;
}

export class ApplicationEvaluationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  evaluatorId!: string;

  @ApiProperty({ enum: EvaluationRecommendation, nullable: true })
  recommendation!: EvaluationRecommendation | null;

  @ApiProperty({ nullable: true })
  comment!: string | null;

  @ApiProperty({ type: [ApplicationEvaluationScoreDto] })
  scores!: ApplicationEvaluationScoreDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

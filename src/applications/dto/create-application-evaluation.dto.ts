import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EvaluationRecommendation } from '../../../generated/prisma/enums';

export class CreateApplicationEvaluationScoreDto {
  @IsString()
  @MinLength(1)
  criterionCode!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateApplicationEvaluationDto {
  @IsOptional()
  @IsEnum(EvaluationRecommendation)
  recommendation?: EvaluationRecommendation;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateApplicationEvaluationScoreDto)
  scores!: CreateApplicationEvaluationScoreDto[];
}

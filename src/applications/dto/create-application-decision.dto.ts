import { IsEnum, IsString, MinLength } from 'class-validator';

export enum ApplicationDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class CreateApplicationDecisionDto {
  @IsEnum(ApplicationDecision)
  decision!: ApplicationDecision;

  @IsString()
  @MinLength(1)
  rationale!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum ProgramBFinalAcceptanceSide {
  COMPANY = 'COMPANY',
  NTI = 'NTI',
}

export class CreateProgramBFinalAcceptanceDto {
  @ApiProperty({
    description: 'Final acceptance side.',
    enum: ProgramBFinalAcceptanceSide,
    example: ProgramBFinalAcceptanceSide.COMPANY,
  })
  @IsEnum(ProgramBFinalAcceptanceSide)
  side!: ProgramBFinalAcceptanceSide;
}

import { ApiProperty } from '@nestjs/swagger';

export class EligibilitySignalDto {
  @ApiProperty({
    example: 'TEAM_SIZE_MIN',
  })
  code: string;

  @ApiProperty({
    example: true,
  })
  passed: boolean;

  @ApiProperty({
    example: 'Team has 1 member(s), required minimum is 2.',
    nullable: true,
  })
  reason: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class EligibilitySignalsResponseDto {
  @ApiProperty()
  applicationId: string;

  @ApiProperty({ type: [EligibilitySignalDto] })
  signals: EligibilitySignalDto[];
}

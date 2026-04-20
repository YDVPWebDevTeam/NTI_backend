import { ApiProperty } from '@nestjs/swagger';
import type { ApplicationStatus } from '../../../generated/prisma/enums';

export class ApplicationDetailDto {
  @ApiProperty({ example: 'f6c90688-c973-40ca-8f3b-c55667cc6f77' })
  id!: string;

  @ApiProperty({ example: '87dcb0e9-2f7e-4ab5-b014-d2f1204bc138' })
  callId!: string;

  @ApiProperty({ example: '5db65d84-f9ae-4221-a4be-15e65e6d4d3c' })
  teamId!: string;

  @ApiProperty({ example: 'b91e88db-5d96-443d-956b-ac4fdcbf95f7' })
  createdById!: string;

  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'FORMALLY_VERIFIED'] })
  status!: ApplicationStatus;

  @ApiProperty({ required: false, nullable: true })
  submittedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  decidedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

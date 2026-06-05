import { ApiProperty } from '@nestjs/swagger';
import {
  ApplicationStatus,
  CallStatus,
  ProgramType,
} from '../../../generated/prisma/enums';

export class StudentApplicationCallSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: ProgramType })
  type!: ProgramType;

  @ApiProperty({ enum: CallStatus })
  status!: CallStatus;
}

export class StudentApplicationSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  callId!: string;

  @ApiProperty()
  teamId!: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiProperty({ required: false, nullable: true })
  submittedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: StudentApplicationCallSummaryDto })
  call!: StudentApplicationCallSummaryDto;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApplicationStatus,
  ProgramType,
} from '../../../generated/prisma/enums';

export class ApplicationsReportRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ProgramType })
  programType!: ProgramType;

  @ApiProperty()
  callTitle!: string;

  @ApiProperty()
  teamName!: string;

  @ApiProperty()
  createdByEmail!: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiPropertyOptional({ nullable: true })
  submittedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  decidedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

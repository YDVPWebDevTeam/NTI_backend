import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramBTeamApplicationStatus } from '../../../generated/prisma/enums';

export class ProgramBReportRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  backlogTitle!: string;

  @ApiProperty()
  teamName!: string;

  @ApiProperty()
  createdByEmail!: string;

  @ApiProperty({ enum: ProgramBTeamApplicationStatus })
  status!: ProgramBTeamApplicationStatus;

  @ApiProperty()
  submittedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  shortlistedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  acceptedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  rejectedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  withdrawnAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

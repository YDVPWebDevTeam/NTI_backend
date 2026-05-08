import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '../../../generated/prisma/enums';

export class ApplicationStatusEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: ApplicationStatus })
  fromStatus!: ApplicationStatus;

  @ApiProperty({ enum: ApplicationStatus })
  toStatus!: ApplicationStatus;

  @ApiProperty()
  changedById!: string;

  @ApiProperty({ required: false, nullable: true })
  reason!: string | null;

  @ApiProperty({ required: false, nullable: true })
  needsInfoItemId!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

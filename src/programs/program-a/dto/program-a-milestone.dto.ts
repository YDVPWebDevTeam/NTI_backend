import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramAMilestoneStatus } from '../../../../generated/prisma/enums';

export class ProgramAMilestoneDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({
    nullable: true,
  })
  description!: string | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  dueAt!: Date | null;

  @ApiProperty({
    enum: ProgramAMilestoneStatus,
  })
  status!: ProgramAMilestoneStatus;

  @ApiPropertyOptional({
    nullable: true,
  })
  progressNote!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

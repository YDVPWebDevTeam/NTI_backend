import { ApiProperty } from '@nestjs/swagger';

class StatusCountDto {
  @ApiProperty()
  status!: string;

  @ApiProperty()
  count!: number;
}

export class ReportsDashboardDto {
  @ApiProperty({ type: [StatusCountDto] })
  applicationsByStatus!: StatusCountDto[];

  @ApiProperty()
  activeProjectsCount!: number;

  @ApiProperty({ type: [StatusCountDto] })
  organizationsByStatus!: StatusCountDto[];

  @ApiProperty()
  callsOpenCount!: number;

  @ApiProperty()
  decisionsLast30Days!: number;
}

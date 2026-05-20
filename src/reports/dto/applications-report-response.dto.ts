import { ApiProperty } from '@nestjs/swagger';
import { ApplicationsReportRowDto } from './applications-report-row.dto';
import { ReportsListMetaDto } from './reports-list-meta.dto';

export class ApplicationsReportResponseDto {
  @ApiProperty({ type: [ApplicationsReportRowDto] })
  data!: ApplicationsReportRowDto[];

  @ApiProperty({ type: ReportsListMetaDto })
  meta!: ReportsListMetaDto;
}

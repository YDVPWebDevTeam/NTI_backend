import { ApiProperty } from '@nestjs/swagger';
import { ProgramBReportRowDto } from './program-b-report-row.dto';
import { ReportsListMetaDto } from './reports-list-meta.dto';

export class ProgramBReportResponseDto {
  @ApiProperty({ type: [ProgramBReportRowDto] })
  data!: ProgramBReportRowDto[];

  @ApiProperty({ type: ReportsListMetaDto })
  meta!: ReportsListMetaDto;
}

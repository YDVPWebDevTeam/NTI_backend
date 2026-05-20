import { ApiProperty } from '@nestjs/swagger';

export class ReportExportAcceptedDto {
  @ApiProperty()
  exportJobId!: string;
}

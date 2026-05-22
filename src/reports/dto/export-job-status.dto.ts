import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EXPORT_JOB_STATUS_VALUES,
  REPORT_DATASET_VALUES,
  REPORT_FORMAT_VALUES,
} from '../reports.constants';

export class ExportJobStatusDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: EXPORT_JOB_STATUS_VALUES })
  status!: string;

  @ApiProperty({ enum: REPORT_DATASET_VALUES })
  dataset!: string;

  @ApiProperty({ enum: REPORT_FORMAT_VALUES })
  format!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  completedAt?: string;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiPropertyOptional()
  downloadUrl?: string;

  @ApiPropertyOptional()
  downloadUrlExpiresAt?: string;
}

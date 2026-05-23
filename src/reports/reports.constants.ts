export const REPORT_DATASET_VALUES = ['applications', 'program-b'] as const;
export type ReportDataset = (typeof REPORT_DATASET_VALUES)[number];

export const REPORT_FORMAT_VALUES = ['csv', 'xlsx', 'pdf'] as const;
export type ReportFormat = (typeof REPORT_FORMAT_VALUES)[number];

export const EXPORT_JOB_STATUS_VALUES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
] as const;
export type ExportJobStatus = (typeof EXPORT_JOB_STATUS_VALUES)[number];

export const REPORT_EXPORT_ACTION = 'REPORT_EXPORT_REQUESTED';
export const REPORT_EXPORT_ENTITY_TYPE = 'REPORT_EXPORT';

export const REPORT_EXPORT_SYNC_THRESHOLD = 500;
export const REPORT_DOWNLOAD_ROUTE_TEMPLATE =
  '/api/v1/reports/export-jobs/{id}/download?token={token}';

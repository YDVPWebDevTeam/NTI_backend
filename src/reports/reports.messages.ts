export const REPORTS_MESSAGES = {
  DATE_FROM_DATE_TO_REQUIRED_FOR_AUDIT:
    'dateFrom and dateTo are required for audit export',
  DATE_FROM_INVALID: 'dateFrom must be a valid ISO datetime',
  DATE_TO_INVALID: 'dateTo must be a valid ISO datetime',
  DATE_FROM_BEFORE_DATE_TO: 'dateFrom must be before dateTo',
  FAILED_TO_SCHEDULE_EXPORT_JOB: 'Failed to schedule export job',
  PROGRAM_A_NOT_SUPPORTED_FOR_PROGRAM_B_EXPORTS:
    'programType=PROGRAM_A is not supported for program-b exports',
  STATUS_MUST_BE_VALID_FOR_APPLICATIONS:
    'status must be a valid ApplicationStatus for applications exports',
  STATUS_MUST_BE_VALID_FOR_PROGRAM_B:
    'status must be a valid ProgramBTeamApplicationStatus for program-b exports',
  SORT_MUST_BE_VALID_FOR_APPLICATIONS:
    'sort must be one of createdAt, submittedAt, decidedAt, status for applications exports',
  SORT_MUST_BE_VALID_FOR_PROGRAM_B:
    'sort must be one of createdAt, submittedAt, status for program-b exports',
} as const;

export const FILES_MESSAGES = {
  UPLOAD_RECORD_NOT_FOUND: 'Upload record was not found',
  UPLOAD_ALREADY_FAILED: 'Upload has already failed',
  UPLOAD_URL_EXPIRED: 'Upload URL has expired',
  UPLOADED_OBJECT_TYPE_MISMATCH: 'Uploaded object type does not match request',
  UPLOADED_OBJECT_SIZE_MISMATCH: 'Uploaded object size does not match request',
  FILE_NOT_FOUND: 'File was not found',
  FILE_NOT_AVAILABLE: 'File is not available for reading yet',
  FILE_TOO_LARGE: 'File is too large',
  FILE_TYPE_NOT_ALLOWED: 'File type is not allowed',
  PUBLIC_UPLOAD_REQUIRES_BASE_URL:
    'Public file uploads require R2_PUBLIC_BASE_URL to be configured',
  FAILED_TO_UPLOAD_GENERATED_FILE: 'Failed to upload generated file to storage',
  FAILED_TO_FINALIZE_GENERATED_FILE: 'Failed to finalize generated file upload',
} as const;

export const ORGANIZATION_DOCUMENTS_MESSAGES = {
  FAILED_TO_ALLOCATE_DOCUMENT_VERSION: 'Failed to allocate document version',
  UPLOAD_ALREADY_FAILED: 'Upload has already failed',
  UPLOAD_URL_EXPIRED: 'Upload URL has expired',
  UPLOADED_OBJECT_TYPE_MISMATCH: 'Uploaded object type does not match request',
  UPLOADED_OBJECT_SIZE_MISMATCH: 'Uploaded object size does not match request',
  DOCUMENT_NOT_AVAILABLE: 'Document is not available for reading yet',
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  ONLY_ACTIVE_MEMBERS_CAN_MANAGE:
    'Only active organization members may manage organization documents',
  ORGANIZATION_DOCUMENT_NOT_FOUND: 'Organization document not found',
  FILE_TOO_LARGE: 'File is too large',
  FILE_TYPE_NOT_ALLOWED: 'File type is not allowed',
} as const;

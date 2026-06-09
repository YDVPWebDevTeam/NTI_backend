export const STUDENT_EMAIL_MESSAGES = {
  DOMAIN_NOT_ALLOWED:
    'This email domain is not on the approved university list. You can request that an administrator add it.',
  EMAIL_ALREADY_IN_USE:
    'This student email is already linked to another account',
  NO_STUDENT_EMAIL: 'No student email has been added yet',
  ALREADY_CONFIRMED: 'Your student email is already confirmed',
  USER_NOT_FOUND: 'User not found',
} as const;

/** Error code surfaced to the frontend so it can offer "request this domain". */
export const STUDENT_EMAIL_DOMAIN_NOT_ALLOWED_CODE =
  'STUDENT_EMAIL_DOMAIN_NOT_ALLOWED';

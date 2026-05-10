import { UserRole } from '../../generated/prisma/enums';

export const CONFIRMATION_PATHS = {
  STUDENT: '/register/student',
  COMPANY_OWNER: '/register/company-owner/confirm-email',
} as const;

export type ConfirmationPath =
  (typeof CONFIRMATION_PATHS)[keyof typeof CONFIRMATION_PATHS];

export function getConfirmationPathByRole(role?: UserRole): ConfirmationPath {
  return role === UserRole.COMPANY_OWNER
    ? CONFIRMATION_PATHS.COMPANY_OWNER
    : CONFIRMATION_PATHS.STUDENT;
}

import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';

const DEFAULT_ADMIN_ROLES: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

export function isAdminRole(
  role: UserRole,
  allowedRoles: readonly UserRole[] = DEFAULT_ADMIN_ROLES,
): boolean {
  return allowedRoles.includes(role);
}

export function ensureAdminRole(
  role: UserRole,
  message = 'Only administrators can access this resource',
  allowedRoles: readonly UserRole[] = DEFAULT_ADMIN_ROLES,
): void {
  if (!isAdminRole(role, allowedRoles)) {
    throw new ForbiddenException(message);
  }
}

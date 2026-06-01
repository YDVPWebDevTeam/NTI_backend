import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { ADMIN_ROLES } from '../common/auth/role-groups';

export function isAdminRole(
  role: UserRole,
  allowedRoles: readonly UserRole[] = ADMIN_ROLES,
): boolean {
  return allowedRoles.includes(role);
}

export function ensureAdminRole(
  role: UserRole,
  message = 'Only administrators can access this resource',
  allowedRoles: readonly UserRole[] = ADMIN_ROLES,
): void {
  if (!isAdminRole(role, allowedRoles)) {
    throw new ForbiddenException(message);
  }
}

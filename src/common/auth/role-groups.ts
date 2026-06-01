import { UserRole } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../types/auth-user-context.type';

/**
 * Canonical role groupings used for authorization across the application.
 * Prefer these over inlining role arrays so the membership of each group lives
 * in exactly one place.
 */
export const ADMIN_ROLES: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

/** NTI-side reviewers: evaluators plus admins. */
export const REVIEWER_ROLES: readonly UserRole[] = [
  UserRole.EVALUATOR,
  ...ADMIN_ROLES,
];

/** Company-side members (organization owner or employee). */
export const COMPANY_ROLES: readonly UserRole[] = [
  UserRole.COMPANY_OWNER,
  UserRole.COMPANY_EMPLOYEE,
];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isReviewerRole(role: UserRole): boolean {
  return REVIEWER_ROLES.includes(role);
}

export function isCompanyRole(role: UserRole): boolean {
  return COMPANY_ROLES.includes(role);
}

type TeamMembershipView = {
  leaderId: string;
  members?: ReadonlyArray<{ userId: string }> | null;
};

/**
 * Returns true when the user is the team leader or one of its members.
 * Fails closed (returns false) when the members relation is absent.
 */
export function isTeamMember(
  team: TeamMembershipView,
  userId: string,
): boolean {
  return (
    team.leaderId === userId ||
    (team.members?.some((member) => member.userId === userId) ?? false)
  );
}

/**
 * Returns true when the user is a company-side member of the given organization.
 * Does not consider account status; callers that require an ACTIVE account must
 * check that separately.
 */
export function isSameOrgCompanyMember(
  user: Pick<AuthenticatedUserContext, 'role' | 'organizationId'>,
  organizationId: string | null | undefined,
): boolean {
  return (
    isCompanyRole(user.role) &&
    organizationId != null &&
    user.organizationId === organizationId
  );
}

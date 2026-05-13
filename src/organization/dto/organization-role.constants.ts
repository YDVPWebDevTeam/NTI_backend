import { UserRole } from 'generated/prisma/enums';

export const ORGANIZATION_MEMBER_ROLES = {
  COMPANY_EMPLOYEE: UserRole.COMPANY_EMPLOYEE,
} as const;

export type OrganizationMemberRole =
  (typeof ORGANIZATION_MEMBER_ROLES)[keyof typeof ORGANIZATION_MEMBER_ROLES];

export const ORGANIZATION_INVITABLE_ROLES = {
  COMPANY_EMPLOYEE: UserRole.COMPANY_EMPLOYEE,
} as const;

export type OrganizationInvitableRole =
  (typeof ORGANIZATION_INVITABLE_ROLES)[keyof typeof ORGANIZATION_INVITABLE_ROLES];

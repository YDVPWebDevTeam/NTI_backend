import type { UserRole, UserStatus } from 'generated/prisma/enums';

export type AuthenticatedUserContext = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string | null;

  /**
   * **There's no refresh token if you don't use the refresh token strategy**, so this field is optional. It will only be present if the user is authenticated via the refresh token strategy.
   */
  refreshTokenId?: string;
};

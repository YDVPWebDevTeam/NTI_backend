import type { UserRole } from 'generated/prisma/enums';

export type JwtPayload = {
  sub: string; // User ID
  email: string;
  role: UserRole;
  organizationId?: string | null;
};

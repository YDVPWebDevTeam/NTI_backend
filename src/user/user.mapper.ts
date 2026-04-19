import type { User } from '../../generated/prisma/client';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';

export function toAuthenticatedUserContext(
  user: Pick<User, 'id' | 'email' | 'status' | 'role' | 'organizationId'>,
): AuthenticatedUserContext {
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    role: user.role,
    organizationId: user.organizationId ?? null,
  };
}

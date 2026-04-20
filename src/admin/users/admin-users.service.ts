import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { RefreshTokenService } from '../../auth/refresh-token/refresh-token.service';
import { UserService } from '../../user/user.service';
import {
  MANAGEABLE_USER_STATUSES,
  type ManageableUserStatus,
} from './dto/update-user-status.dto';
import { toAuthenticatedUserContext } from '../../user/user.mapper';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly userService: UserService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async getUsers(
    actor: AuthenticatedUserContext,
  ): Promise<AuthenticatedUserContext[]> {
    ensureAdminRole(actor.role, 'Only administrators can access users');

    const users = await this.userService.findMany();

    return users.map((user) => toAuthenticatedUserContext(user));
  }

  async getUserById(
    actor: AuthenticatedUserContext,
    targetUserId: string,
  ): Promise<AuthenticatedUserContext> {
    ensureAdminRole(actor.role, 'Only administrators can access users');

    const targetUser = await this.userService.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    return toAuthenticatedUserContext(targetUser);
  }

  async updateStatus(
    actor: AuthenticatedUserContext,
    targetUserId: string,
    status: ManageableUserStatus,
  ): Promise<AuthenticatedUserContext> {
    ensureAdminRole(actor.role, 'Only administrators can manage user statuses');

    const targetUser = await this.userService.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (actor.id === targetUser.id) {
      throw new ForbiddenException('You cannot change your own account status');
    }

    if (
      actor.role === UserRole.ADMIN &&
      (targetUser.role === UserRole.SUPER_ADMIN ||
        targetUser.role === UserRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Admins cannot change the status of other administrators',
      );
    }

    const updatedUser = await this.userService.transaction(async (db) => {
      const user = await this.userService.update(targetUser.id, { status }, db);

      if (status === MANAGEABLE_USER_STATUSES.SUSPENDED) {
        await this.refreshTokenService.revokeAllActiveByUserId(
          targetUser.id,
          db,
        );
      }

      return user;
    });

    return toAuthenticatedUserContext(updatedUser);
  }
}

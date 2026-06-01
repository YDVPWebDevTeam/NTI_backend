import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { UserRole } from '../../../generated/prisma/enums';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import {
  buildPaginationMeta,
  resolvePagination,
  resolveSortOrder,
} from '../../common/pagination';
import { RefreshTokenService } from '../../auth/refresh-token/refresh-token.service';
import { UserService } from '../../user/user.service';
import { UserRepository } from '../../user/user.repository';
import {
  MANAGEABLE_USER_STATUSES,
  type ManageableUserStatus,
} from './dto/update-user-status.dto';
import { toAuthenticatedUserContext } from '../../user/user.mapper';
import type { ListUsersQueryDto } from './dto/list-users-query.dto';
import type { ListUsersResponseDto } from './dto/list-users-response.dto';
import { ADMIN_USERS_MESSAGES } from './admin-users.messages';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async listUsers(
    actor: AuthenticatedUserContext,
    query: ListUsersQueryDto,
  ): Promise<ListUsersResponseDto> {
    ensureAdminRole(actor.role, 'Only administrators can access users');

    const where: Prisma.UserWhereInput = {
      ...(query.q && {
        OR: [
          { email: { contains: query.q, mode: 'insensitive' } },
          { firstName: { contains: query.q, mode: 'insensitive' } },
          { lastName: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
      ...(query.role && { role: query.role }),
      ...(query.status && { status: query.status }),
      ...(query.organizationId && { organizationId: query.organizationId }),
    };

    // 'name' is not a DB column — sort by firstName then lastName for full-name ordering
    const primarySorts: Prisma.UserOrderByWithRelationInput[] =
      query.sort === 'name'
        ? [
            { firstName: resolveSortOrder(query.order) },
            { lastName: resolveSortOrder(query.order) },
          ]
        : [{ [query.sort]: resolveSortOrder(query.order) }];

    const orderBy: Prisma.UserOrderByWithRelationInput[] = [
      ...primarySorts,
      { id: 'asc' },
    ];
    const pagination = resolvePagination(query);

    const { data, total } = await this.userRepository.findManyPaginated({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
    });

    return {
      data: data.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
      })),
      meta: {
        ...buildPaginationMeta(total, pagination.page, pagination.limit),
        sort: query.sort,
        order: query.order,
      },
    };
  }

  async getUserById(
    actor: AuthenticatedUserContext,
    targetUserId: string,
  ): Promise<AuthenticatedUserContext> {
    ensureAdminRole(actor.role, 'Only administrators can access users');

    const targetUser = await this.userService.findById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException(ADMIN_USERS_MESSAGES.USER_NOT_FOUND);
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
      throw new NotFoundException(ADMIN_USERS_MESSAGES.USER_NOT_FOUND);
    }

    if (actor.id === targetUser.id) {
      throw new ForbiddenException(
        ADMIN_USERS_MESSAGES.CANNOT_CHANGE_OWN_STATUS,
      );
    }

    if (
      actor.role === UserRole.ADMIN &&
      (targetUser.role === UserRole.SUPER_ADMIN ||
        targetUser.role === UserRole.ADMIN)
    ) {
      throw new ForbiddenException(
        ADMIN_USERS_MESSAGES.ADMINS_CANNOT_CHANGE_ADMIN_STATUS,
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

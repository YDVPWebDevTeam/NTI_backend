import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, type User } from '../../generated/prisma/client';
import { isPrismaUniqueConstraintError } from '../common/prisma/prisma-error.utils';
import { UserRepository } from './user.repository';
import { USER_MESSAGES } from './user.messages';
import { PrismaDbClient } from '../infrastructure/database';
import { AuthenticatedUserContext } from 'src/common/types/auth-user-context.type';

@Injectable()
export class UserService {
  constructor(private readonly users: UserRepository) {}

  findById(id: string, db?: PrismaDbClient): Promise<User | null> {
    return this.users.findUnique({ id }, db);
  }

  findByEmail(email: string, db?: PrismaDbClient): Promise<User | null> {
    return this.users.findByEmail(email, db);
  }

  findMany(db?: PrismaDbClient): Promise<User[]> {
    return this.users.findMany(undefined, db);
  }

  async create(
    data: Prisma.UserUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<User> {
    try {
      return await this.users.create(data, db);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(USER_MESSAGES.EMAIL_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  update(
    id: string,
    data: Prisma.UserUncheckedUpdateInput,
    db?: PrismaDbClient,
  ): Promise<User> {
    return this.users.update({ id }, data, db);
  }

  markEmailConfirmed(userId: string, db?: PrismaDbClient): Promise<User> {
    return this.users.markEmailConfirmed(userId, db);
  }

  transaction<T>(fn: (db: PrismaDbClient) => Promise<T>): Promise<T> {
    return this.users.transaction(fn);
  }

  bareSafeUser(user: User): AuthenticatedUserContext {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}

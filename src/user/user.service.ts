import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, type User } from '../../generated/prisma/client';
import { UserRepository } from './user.repository';
import { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { PrismaDbClient } from '../infrastructure/database';

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
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('User with this email already exists');
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
    };
  }

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string' &&
      error.code === 'P2002'
    );
  }
}

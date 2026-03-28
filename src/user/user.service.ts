import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '../../generated/prisma/client';
import { UserRepository } from './user.repository';
import { AuthenticatedUserContext } from 'src/common/types/auth-user-context.type';

@Injectable()
export class UserService {
  constructor(private readonly users: UserRepository) {}

  findById(id: string): Promise<User | null> {
    return this.users.findUnique({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email);
  }

  create(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return this.users.create(data);
  }

  update(id: string, data: Prisma.UserUncheckedUpdateInput): Promise<User> {
    return this.users.update({ id }, data);
  }

  markEmailConfirmed(userId: string): Promise<User> {
    return this.users.markEmailConfirmed(userId);
  }

  markAdminConfirmed(userId: string): Promise<User> {
    return this.users.markAdminConfirmed(userId);
  }

  bareSafeUser(user: User): AuthenticatedUserContext {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role,
    };
  }
}

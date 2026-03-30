import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '../../generated/prisma/client';
import { BaseRepository } from '../infrastructure/database/base.repository';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Injectable()
export class UserRepository extends BaseRepository<
  User,
  Prisma.UserUncheckedCreateInput,
  Prisma.UserUncheckedUpdateInput,
  Prisma.UserWhereInput,
  Prisma.UserWhereUniqueInput,
  Prisma.UserOrderByWithRelationInput
> {
  protected get delegate() {
    return this.prisma.client.user;
  }

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.findUnique({ email });
  }

  markEmailConfirmed(userId: string): Promise<User> {
    return this.update(
      { id: userId },
      {
        isEmailConfirmed: true,
      },
    );
  }

  markAdminConfirmed(userId: string): Promise<User> {
    return this.update(
      { id: userId },
      {
        isAdminConfirmed: true,
      },
    );
  }
}

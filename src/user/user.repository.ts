import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '../../generated/prisma/client';
import {
  BaseRepository,
  PrismaDbClient,
} from '../infrastructure/database/base.repository';
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
  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).user;
  }

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByEmail(email: string, db?: PrismaDbClient): Promise<User | null> {
    return this.findUnique({ email }, db);
  }

  markEmailConfirmed(userId: string, db?: PrismaDbClient): Promise<User> {
    return this.update(
      { id: userId },
      {
        isEmailConfirmed: true,
      },
      db,
    );
  }

  markAdminConfirmed(userId: string, db?: PrismaDbClient): Promise<User> {
    return this.update(
      { id: userId },
      {
        isAdminConfirmed: true,
      },
      db,
    );
  }

  updateOrganizationIfNotExists(
    tx: Prisma.TransactionClient,
    userId: string,
    organizationId: string,
  ) {
    return tx.user.updateMany({
      where: {
        id: userId,
        organizationId: null,
      },
      data: { organizationId },
    });
  }
}

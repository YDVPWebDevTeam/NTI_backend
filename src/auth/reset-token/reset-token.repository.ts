import { Injectable } from '@nestjs/common';
import type {
  PasswordResetToken,
  Prisma,
} from '../../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class ResetTokenRepository extends BaseRepository<
  PasswordResetToken,
  Prisma.PasswordResetTokenUncheckedCreateInput,
  Prisma.PasswordResetTokenUncheckedUpdateInput,
  Prisma.PasswordResetTokenWhereInput,
  Prisma.PasswordResetTokenWhereUniqueInput,
  Prisma.PasswordResetTokenOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).passwordResetToken;
  }

  findByToken(
    token: string,
    db?: PrismaDbClient,
  ): Promise<PasswordResetToken | null> {
    return this.findFirst(
      {
        token,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      db,
    );
  }

  findByUserId(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<PasswordResetToken | null> {
    return this.findUnique({ userId }, db);
  }

  createOrReplaceForUser(
    data: Prisma.PasswordResetTokenUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<PasswordResetToken> {
    return this.upsert(
      {
        where: {
          userId: data.userId,
        },
        create: data,
        update: {
          token: data.token,
          expiresAt: data.expiresAt,
          usedAt: null,
        },
      },
      db,
    );
  }

  markUsed(
    id: string,
    usedAt = new Date(),
    db?: PrismaDbClient,
  ): Promise<PasswordResetToken> {
    return this.update(
      { id },
      {
        usedAt,
      },
      db,
    );
  }

  deleteByUserId(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<PasswordResetToken> {
    return this.delete({ userId }, db);
  }
}

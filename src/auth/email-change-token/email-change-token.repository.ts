import { Injectable } from '@nestjs/common';
import type {
  EmailChangeToken,
  Prisma,
} from '../../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class EmailChangeTokenRepository extends BaseRepository<
  EmailChangeToken,
  Prisma.EmailChangeTokenUncheckedCreateInput,
  Prisma.EmailChangeTokenUncheckedUpdateInput,
  Prisma.EmailChangeTokenWhereInput,
  Prisma.EmailChangeTokenWhereUniqueInput,
  Prisma.EmailChangeTokenOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).emailChangeToken;
  }

  findByUserId(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<EmailChangeToken | null> {
    return this.findUnique({ userId }, db);
  }

  findByTokenHash(
    tokenHash: string,
    db?: PrismaDbClient,
  ): Promise<EmailChangeToken | null> {
    return this.findUnique({ tokenHash }, db);
  }

  createOrReplaceForUser(
    data: Prisma.EmailChangeTokenUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<EmailChangeToken> {
    return this.upsert(
      {
        where: { userId: data.userId },
        create: data,
        update: {
          tokenHash: data.tokenHash,
          newEmail: data.newEmail,
          expiresAt: data.expiresAt,
          usedAt: null,
        },
      },
      db,
    );
  }

  consumeByTokenHash(
    tokenHash: string,
    usedAt = new Date(),
    db?: PrismaDbClient,
  ): Promise<EmailChangeToken | null> {
    const delegate = this.getDelegate(db);

    return delegate
      .updateMany({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: {
            gt: usedAt,
          },
        },
        data: {
          usedAt,
        },
      })
      .then(async (result) => {
        if (result.count !== 1) {
          return null;
        }

        return this.findByTokenHash(tokenHash, db);
      });
  }
}

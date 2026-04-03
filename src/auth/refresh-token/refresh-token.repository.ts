import { Injectable } from '@nestjs/common';
import type { Prisma, RefreshToken } from '../../../generated/prisma/client';
import {
  BaseRepository,
  PrismaDbClient,
} from '../../infrastructure/database/base.repository';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class RefreshTokenRepository extends BaseRepository<
  RefreshToken,
  Prisma.RefreshTokenUncheckedCreateInput,
  Prisma.RefreshTokenUncheckedUpdateInput,
  Prisma.RefreshTokenWhereInput,
  Prisma.RefreshTokenWhereUniqueInput,
  Prisma.RefreshTokenOrderByWithRelationInput
> {
  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).refreshToken;
  }

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByTokenId(id: string): Promise<RefreshToken | null> {
    return this.findUnique({ id });
  }

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.findUnique({ tokenHash });
  }

  findActiveTokensByUserId(userId: string): Promise<RefreshToken[]> {
    return this.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  revokeTokenById(
    id: string,
    revokedAt = new Date(),
    db?: PrismaDbClient,
  ): Promise<RefreshToken> {
    return this.update(
      { id },
      {
        revokedAt,
      },
      db,
    );
  }

  async revokeActiveTokensByUserId(
    userId: string,
    revokedAt = new Date(),
    db?: PrismaDbClient,
  ): Promise<number> {
    const result = await this.getDelegate(db).updateMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: revokedAt,
        },
      },
      data: {
        revokedAt,
      },
    });

    return result.count;
  }
}

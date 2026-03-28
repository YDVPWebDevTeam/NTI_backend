import { Injectable } from '@nestjs/common';
import type { Prisma, RefreshToken } from '../../../generated/prisma/client';
import { BaseRepository } from '../../infrastructure/database/base.repository';
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
  protected get delegate() {
    return this.prisma.client.refreshToken;
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

  findActiveTokenByUserId(userId: string): Promise<RefreshToken | null> {
    return this.findFirst({
      userId,
      revokedAt: null,
    });
  }

  revokeTokenById(id: string, revokedAt = new Date()): Promise<RefreshToken> {
    return this.update(
      { id },
      {
        revokedAt,
      },
    );
  }
}

import { Injectable } from '@nestjs/common';
import type { Prisma, RefreshToken } from '../../../generated/prisma/client';
import type { PrismaDbClient } from '../../infrastructure/database';
import { RefreshTokenRepository } from './refresh-token.repository';

@Injectable()
export class RefreshTokenService {
  constructor(private readonly refreshTokens: RefreshTokenRepository) {}

  findByTokenId(id: string): Promise<RefreshToken | null> {
    return this.refreshTokens.findByTokenId(id);
  }

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.refreshTokens.findByTokenHash(tokenHash);
  }

  findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokens.findActiveTokensByUserId(userId);
  }

  create(
    data: Prisma.RefreshTokenUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<RefreshToken> {
    return this.refreshTokens.create(data, db);
  }

  revokeById(id: string, db?: PrismaDbClient): Promise<RefreshToken> {
    return this.refreshTokens.revokeTokenById(id, new Date(), db);
  }

  revokeAllActiveByUserId(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<number> {
    return this.refreshTokens.revokeActiveTokensByUserId(
      userId,
      new Date(),
      db,
    );
  }
}

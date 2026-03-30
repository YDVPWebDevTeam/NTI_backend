import { Injectable } from '@nestjs/common';
import type { Prisma, RefreshToken } from '../../../generated/prisma/client';
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

  create(data: Prisma.RefreshTokenUncheckedCreateInput): Promise<RefreshToken> {
    return this.refreshTokens.create(data);
  }

  revokeById(id: string): Promise<RefreshToken> {
    return this.refreshTokens.revokeTokenById(id);
  }
}

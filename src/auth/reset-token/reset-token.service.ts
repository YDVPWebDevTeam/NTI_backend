import { Injectable } from '@nestjs/common';
import type {
  PasswordResetToken,
  Prisma,
} from '../../../generated/prisma/client';
import type { PrismaDbClient } from '../../infrastructure/database';
import { ConfigService } from '../../infrastructure/config';
import { HashingService } from '../../infrastructure/hashing';
import { ResetTokenRepository } from './reset-token.repository';

@Injectable()
export class ResetTokenService {
  constructor(
    private readonly resetTokenRepository: ResetTokenRepository,
    private readonly configService: ConfigService,
    private readonly hashingService: HashingService,
  ) {}

  findByToken(
    token: string,
    db?: PrismaDbClient,
  ): Promise<PasswordResetToken | null> {
    return this.resetTokenRepository.findByToken(token, db);
  }

  findByUserId(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<PasswordResetToken | null> {
    return this.resetTokenRepository.findByUserId(userId, db);
  }

  create(
    data: Prisma.PasswordResetTokenUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<PasswordResetToken> {
    return this.resetTokenRepository.create(data, db);
  }

  createForUser(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<PasswordResetToken> {
    return this.resetTokenRepository.createOrReplaceForUser(
      {
        userId,
        token: this.generateToken(),
        expiresAt: this.resolveExpirationDate(),
      },
      db,
    );
  }

  markUsed(id: string, db?: PrismaDbClient): Promise<PasswordResetToken> {
    return this.resetTokenRepository.markUsed(id, new Date(), db);
  }

  deleteByUserId(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<PasswordResetToken> {
    return this.resetTokenRepository.deleteByUserId(userId, db);
  }

  generateToken(): string {
    return this.hashingService.generateHexToken(
      this.configService.tokenByteLength,
    );
  }

  resolveExpirationDate(
    minutes = this.configService.passwordResetExpirationMinutes,
  ): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }
}

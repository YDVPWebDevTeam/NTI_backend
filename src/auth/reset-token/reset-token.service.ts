import { Injectable } from '@nestjs/common';
import type {
  PasswordResetToken,
  Prisma,
} from '../../../generated/prisma/client';
import type { PrismaDbClient } from '../../infrastructure/database';
import { ConfigService } from '../../infrastructure/config';
import { HashingService } from '../../infrastructure/hashing';
import { ResetTokenRepository } from './reset-token.repository';

export type PasswordResetTokenPayload = {
  token: string;
  resetToken: PasswordResetToken;
};

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
    return this.resetTokenRepository.findByToken(
      this.hashingService.hashToken(token),
      db,
    );
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
  ): Promise<PasswordResetTokenPayload> {
    const token = this.generateToken();

    // The raw token is only sent to the user once. We persist its hash so a
    // read-only database leak does not immediately expose valid reset links.
    return this.resetTokenRepository
      .createOrReplaceForUser(
        {
          userId,
          tokenHash: this.hashingService.hashToken(token),
          expiresAt: this.resolveExpirationDate(),
        },
        db,
      )
      .then((resetToken) => ({ token, resetToken }));
  }

  markUsed(id: string, db?: PrismaDbClient): Promise<PasswordResetToken> {
    return this.resetTokenRepository.markUsed(id, new Date(), db);
  }

  consumeByToken(
    token: string,
    db?: PrismaDbClient,
  ): Promise<PasswordResetToken | null> {
    return this.resetTokenRepository.consumeByToken(
      this.hashingService.hashToken(token),
      new Date(),
      db,
    );
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

import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  EmailVerificationToken,
  Prisma,
} from '../../../generated/prisma/client';
import type { PrismaDbClient } from '../../infrastructure/database';
import { EmailVerificationRepository } from './email-verification.repository';
import { ConfigService } from '../../infrastructure/config';
import { HashingService } from '../../infrastructure/hashing';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly configService: ConfigService,
    private readonly hashingService: HashingService,
  ) {}

  findByToken(
    token: string,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken | null> {
    return this.emailVerificationRepository.findByToken(token, db);
  }

  findByUserId(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken | null> {
    return this.emailVerificationRepository.findByUserId(userId, db);
  }

  async createForUser(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken> {
    return this.emailVerificationRepository.createOrReplaceForUser(
      {
        userId,
        token: this.generateToken(),
        expiresAt: this.resolveExpirationDate(),
      },
      db,
    );
  }

  create(
    data: Prisma.EmailVerificationTokenUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken> {
    return this.emailVerificationRepository.create(data, db);
  }

  async validateTokenOrThrow(
    token: string,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken> {
    const bypassEmail = this.resolveDevBypassEmail(token);
    const verificationToken = bypassEmail
      ? await this.findLatestPendingTokenForBypassEmail(bypassEmail, db)
      : await this.findByToken(token, db);
    const invalidTokenMessage = 'Invalid or expired verification token';

    if (
      !verificationToken ||
      verificationToken.expiresAt <= new Date() ||
      verificationToken.acceptedAt
    ) {
      throw new BadRequestException(invalidTokenMessage);
    }

    return verificationToken;
  }

  private resolveDevBypassEmail(token: string): string | null {
    const bypassToken = this.configService.devEmailVerificationBypassToken;

    if (
      !this.configService.isDevelopment ||
      !this.configService.devEmailVerificationBypassEnabled
    ) {
      return null;
    }

    if (bypassToken) {
      const dynamicPrefix = `${bypassToken}:`;
      if (token.startsWith(dynamicPrefix)) {
        const email = token.slice(dynamicPrefix.length).trim().toLowerCase();
        return this.isValidEmail(email) ? email : null;
      }
    }

    const directEmailToken = token.trim().toLowerCase();
    return this.isValidEmail(directEmailToken) ? directEmailToken : null;
  }

  private async findLatestPendingTokenForBypassEmail(
    bypassEmail: string,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken | null> {
    return (
      (
        await this.emailVerificationRepository.findMany(
          {
            where: {
              acceptedAt: null,
              expiresAt: {
                gt: new Date(),
              },
              user: {
                email: bypassEmail,
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          db,
        )
      )[0] ?? null
    );
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  markAccepted(
    id: string,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken> {
    return this.emailVerificationRepository.markAccepted(id, new Date(), db);
  }

  deleteByToken(
    token: string,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken> {
    return this.emailVerificationRepository.deleteByToken(token, db);
  }

  generateToken(): string {
    return this.hashingService.generateHexToken(
      this.configService.tokenByteLength,
    );
  }

  resolveExpirationDate(
    hours = this.configService.emailVerificationExpirationHours,
  ): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }
}

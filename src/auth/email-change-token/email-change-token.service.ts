import { Injectable } from '@nestjs/common';
import type {
  EmailChangeToken,
  Prisma,
} from '../../../generated/prisma/client';
import type { PrismaDbClient } from '../../infrastructure/database';
import { ConfigService } from '../../infrastructure/config';
import { HashingService } from '../../infrastructure/hashing';
import { addHours } from '../../common/time/time.utils';
import { resolveDevBypassEmail } from '../token/dev-email-bypass.utils';
import { EmailChangeTokenRepository } from './email-change-token.repository';

export type EmailChangeTokenPayload = {
  token: string;
  emailChangeToken: EmailChangeToken;
};

@Injectable()
export class EmailChangeTokenService {
  constructor(
    private readonly emailChangeTokenRepository: EmailChangeTokenRepository,
    private readonly configService: ConfigService,
    private readonly hashingService: HashingService,
  ) {}

  create(
    data: Prisma.EmailChangeTokenUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<EmailChangeToken> {
    return this.emailChangeTokenRepository.create(data, db);
  }

  findByUserId(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<EmailChangeToken | null> {
    return this.emailChangeTokenRepository.findByUserId(userId, db);
  }

  createForUser(
    userId: string,
    newEmail: string,
    db?: PrismaDbClient,
  ): Promise<EmailChangeTokenPayload> {
    const token = this.generateToken();

    return this.emailChangeTokenRepository
      .createOrReplaceForUser(
        {
          userId,
          newEmail,
          tokenHash: this.hashingService.hashToken(token),
          expiresAt: this.resolveExpirationDate(),
        },
        db,
      )
      .then((emailChangeToken) => ({ token, emailChangeToken }));
  }

  consumeByToken(
    token: string,
    db?: PrismaDbClient,
  ): Promise<EmailChangeToken | null> {
    const bypassEmail = this.resolveDevBypassEmail(token);

    if (bypassEmail) {
      return this.findLatestPendingTokenForBypassEmail(bypassEmail, db).then(
        (emailChangeToken) => {
          if (!emailChangeToken) {
            return null;
          }

          return this.emailChangeTokenRepository.consumeByTokenHash(
            emailChangeToken.tokenHash,
            new Date(),
            db,
          );
        },
      );
    }

    return this.emailChangeTokenRepository.consumeByTokenHash(
      this.hashingService.hashToken(token),
      new Date(),
      db,
    );
  }

  private resolveDevBypassEmail(token: string): string | null {
    return resolveDevBypassEmail(token, this.configService);
  }

  private async findLatestPendingTokenForBypassEmail(
    bypassEmail: string,
    db?: PrismaDbClient,
  ): Promise<EmailChangeToken | null> {
    return (
      (
        await this.emailChangeTokenRepository.findMany(
          {
            where: {
              usedAt: null,
              expiresAt: {
                gt: new Date(),
              },
              newEmail: bypassEmail,
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

  generateToken(): string {
    return this.hashingService.generateHexToken(
      this.configService.tokenByteLength,
    );
  }

  resolveExpirationDate(
    hours = this.configService.emailVerificationExpirationHours,
  ): Date {
    return addHours(new Date(), hours);
  }
}

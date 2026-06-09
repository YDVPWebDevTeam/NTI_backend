import { BadRequestException, Injectable } from '@nestjs/common';
import type { StudentEmailVerificationToken } from '../../generated/prisma/client';
import { addHours } from '../common/time/time.utils';
import { ConfigService } from '../infrastructure/config';
import type { PrismaDbClient } from '../infrastructure/database';
import { HashingService } from '../infrastructure/hashing';
import { StudentEmailVerificationRepository } from './student-email-verification.repository';

@Injectable()
export class StudentEmailVerificationService {
  constructor(
    private readonly repository: StudentEmailVerificationRepository,
    private readonly configService: ConfigService,
    private readonly hashingService: HashingService,
  ) {}

  findByUserId(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<StudentEmailVerificationToken | null> {
    return this.repository.findByUserId(userId, db);
  }

  createForUser(
    userId: string,
    email: string,
    db?: PrismaDbClient,
  ): Promise<StudentEmailVerificationToken> {
    return this.repository.createOrReplaceForUser(
      {
        userId,
        email,
        token: this.generateToken(),
        expiresAt: this.resolveExpirationDate(),
      },
      db,
    );
  }

  async validateTokenOrThrow(
    token: string,
    db?: PrismaDbClient,
  ): Promise<StudentEmailVerificationToken> {
    const verificationToken = await this.repository.findByToken(token, db);

    if (
      !verificationToken ||
      verificationToken.expiresAt <= new Date() ||
      verificationToken.acceptedAt
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    return verificationToken;
  }

  markAccepted(
    id: string,
    db?: PrismaDbClient,
  ): Promise<StudentEmailVerificationToken> {
    return this.repository.markAccepted(id, new Date(), db);
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

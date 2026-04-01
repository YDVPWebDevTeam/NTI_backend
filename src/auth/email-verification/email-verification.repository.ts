import { Injectable } from '@nestjs/common';
import type {
  EmailVerificationToken,
  Prisma,
} from '../../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class EmailVerificationRepository extends BaseRepository<
  EmailVerificationToken,
  Prisma.EmailVerificationTokenUncheckedCreateInput,
  Prisma.EmailVerificationTokenUncheckedUpdateInput,
  Prisma.EmailVerificationTokenWhereInput,
  Prisma.EmailVerificationTokenWhereUniqueInput,
  Prisma.EmailVerificationTokenOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).emailVerificationToken;
  }

  findByToken(
    token: string,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken | null> {
    return this.findUnique({ token }, db);
  }

  findByUserId(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken | null> {
    return this.findUnique({ userId }, db);
  }

  createOrReplaceForUser(
    data: Prisma.EmailVerificationTokenUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken> {
    return this.upsert(
      {
        where: {
          userId: data.userId,
        },
        create: data,
        update: {
          token: data.token,
          expiresAt: data.expiresAt,
          acceptedAt: null,
        },
      },
      db,
    );
  }

  markAccepted(
    id: string,
    acceptedAt = new Date(),
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken> {
    return this.update(
      { id },
      {
        acceptedAt,
      },
      db,
    );
  }

  deleteByToken(
    token: string,
    db?: PrismaDbClient,
  ): Promise<EmailVerificationToken> {
    return this.delete({ token }, db);
  }
}

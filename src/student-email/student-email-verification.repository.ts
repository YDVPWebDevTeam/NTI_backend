import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  StudentEmailVerificationToken,
} from '../../generated/prisma/client';
import {
  BaseRepository,
  PrismaDbClient,
  PrismaService,
} from '../infrastructure/database';

@Injectable()
export class StudentEmailVerificationRepository extends BaseRepository<
  StudentEmailVerificationToken,
  Prisma.StudentEmailVerificationTokenUncheckedCreateInput,
  Prisma.StudentEmailVerificationTokenUncheckedUpdateInput,
  Prisma.StudentEmailVerificationTokenWhereInput,
  Prisma.StudentEmailVerificationTokenWhereUniqueInput,
  Prisma.StudentEmailVerificationTokenOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).studentEmailVerificationToken;
  }

  findByToken(
    token: string,
    db?: PrismaDbClient,
  ): Promise<StudentEmailVerificationToken | null> {
    return this.findUnique({ token }, db);
  }

  findByUserId(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<StudentEmailVerificationToken | null> {
    return this.findUnique({ userId }, db);
  }

  createOrReplaceForUser(
    data: Prisma.StudentEmailVerificationTokenUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<StudentEmailVerificationToken> {
    return this.upsert(
      {
        where: { userId: data.userId },
        create: data,
        update: {
          token: data.token,
          email: data.email,
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
  ): Promise<StudentEmailVerificationToken> {
    return this.update({ id }, { acceptedAt }, db);
  }
}

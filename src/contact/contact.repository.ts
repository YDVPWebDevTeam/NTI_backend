import { Injectable } from '@nestjs/common';
import type { ContactSubmission, Prisma } from '../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

@Injectable()
export class ContactRepository extends BaseRepository<
  ContactSubmission,
  Prisma.ContactSubmissionUncheckedCreateInput,
  Prisma.ContactSubmissionUncheckedUpdateInput,
  Prisma.ContactSubmissionWhereInput,
  Prisma.ContactSubmissionWhereUniqueInput,
  Prisma.ContactSubmissionOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).contactSubmission;
  }

  findById(id: string, db?: PrismaDbClient): Promise<ContactSubmission | null> {
    return (db ?? this.prisma.client).contactSubmission.findUnique({
      where: { id },
    });
  }

  findAll(db?: PrismaDbClient): Promise<ContactSubmission[]> {
    return (db ?? this.prisma.client).contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}

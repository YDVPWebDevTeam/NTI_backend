import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  UniversityEmailDomain,
} from '../../generated/prisma/client';
import {
  BaseRepository,
  PrismaDbClient,
  PrismaService,
} from '../infrastructure/database';

@Injectable()
export class UniversityEmailDomainRepository extends BaseRepository<
  UniversityEmailDomain,
  Prisma.UniversityEmailDomainUncheckedCreateInput,
  Prisma.UniversityEmailDomainUncheckedUpdateInput,
  Prisma.UniversityEmailDomainWhereInput,
  Prisma.UniversityEmailDomainWhereUniqueInput,
  Prisma.UniversityEmailDomainOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).universityEmailDomain;
  }

  findByDomain(
    domain: string,
    db?: PrismaDbClient,
  ): Promise<UniversityEmailDomain | null> {
    return this.findUnique({ domain }, db);
  }
}

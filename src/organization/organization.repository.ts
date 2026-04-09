import { Injectable } from '@nestjs/common';
import { Organization, Prisma, PrismaClient } from 'generated/prisma/client';
import {
  BaseRepository,
  PrismaService,
  PrismaDbClient,
} from 'src/infrastructure/database';

type OrganizationDelegate = PrismaClient['organization'];

@Injectable()
export class OrganizationRepository extends BaseRepository<
  Organization,
  Prisma.OrganizationCreateInput,
  Prisma.OrganizationUpdateInput,
  Prisma.OrganizationWhereInput,
  Prisma.OrganizationWhereUniqueInput,
  Prisma.OrganizationOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient): OrganizationDelegate {
    const client = db ?? this.prisma.client;
    return client.organization;
  }
}

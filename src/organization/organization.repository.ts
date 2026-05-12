import { Injectable } from '@nestjs/common';
import { Organization, Prisma, PrismaClient } from 'generated/prisma/client';
import {
  BaseRepository,
  PrismaService,
  PrismaDbClient,
} from 'src/infrastructure/database';

type OrganizationDelegate = PrismaClient['organization'];

export type OrgWithMembersCount = Organization & { membersCount: number };

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

  async findManyForAdminPaginated(
    args: {
      where?: Prisma.OrganizationWhereInput;
      orderBy?:
        | Prisma.OrganizationOrderByWithRelationInput
        | Prisma.OrganizationOrderByWithRelationInput[];
      skip?: number;
      take?: number;
    },
    db?: PrismaDbClient,
  ): Promise<{ data: OrgWithMembersCount[]; total: number }> {
    const client = db ?? this.prisma.client;
    const [rows, total] = await Promise.all([
      client.organization.findMany({
        ...args,
        include: { _count: { select: { users: true } } },
      }),
      client.organization.count({ where: args.where }),
    ]);

    return {
      data: rows.map(({ _count, ...org }) => ({
        ...org,
        membersCount: _count.users,
      })),
      total,
    };
  }
}

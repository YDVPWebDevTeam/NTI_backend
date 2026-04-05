import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/infrastructure/database';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tx: Prisma.TransactionClient, data: Prisma.OrganizationCreateInput) {
    return tx.organization.create({ data });
  }

  delete(tx: Prisma.TransactionClient, id: string) {
    return tx.organization.delete({ where: { id } });
  }
}

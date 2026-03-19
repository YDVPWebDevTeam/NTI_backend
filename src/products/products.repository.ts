import { Injectable } from '@nestjs/common';
import { Prisma, Product } from '../../generated/prisma/client.js';
import { PrismaService } from '../infrastructure/database';
import { BaseRepository } from '../infrastructure/database';

@Injectable()
export class ProductsRepository extends BaseRepository<
  Product,
  Prisma.ProductCreateInput,
  Prisma.ProductUpdateInput,
  Prisma.ProductWhereInput,
  Prisma.ProductWhereUniqueInput,
  Prisma.ProductOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get delegate() {
    return this.prisma.client.product;
  }

  findByName(name: string): Promise<Product | null> {
    return this.findFirst({ name });
  }

  findInStock(): Promise<Product[]> {
    return this.findMany({ where: { stock: { gt: 0 } } });
  }

  findByPriceRange(min: number, max: number): Promise<Product[]> {
    return this.findMany({
      where: { price: { gte: min, lte: max } },
      orderBy: { price: 'asc' },
    });
  }
}

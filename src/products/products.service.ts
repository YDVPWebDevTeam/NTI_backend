import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  findAll(params?: { skip?: number; take?: number }) {
    return this.productsRepository.findMany(params);
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findUnique({ id });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  create(data: Prisma.ProductCreateInput) {
    return this.productsRepository.create(data);
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    await this.findOne(id); // throws if not found
    return this.productsRepository.update({ id }, data);
  }

  async remove(id: string) {
    await this.findOne(id); // throws if not found
    return this.productsRepository.delete({ id });
  }

  findInStock() {
    return this.productsRepository.findInStock();
  }
}

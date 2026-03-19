import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import type {
  ProductCreateInput,
  ProductUpdateInput,
} from '../../generated/prisma/models/Product';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.productsService.findAll({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('in-stock')
  findInStock() {
    return this.productsService.findInStock();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  create(@Body() body: ProductCreateInput) {
    return this.productsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: ProductUpdateInput) {
    return this.productsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

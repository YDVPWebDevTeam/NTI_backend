import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './infrastructure/config';
import { DatabaseModule } from './infrastructure/database';
import { ProductsModule } from './products/products.module.js';

@Module({
  imports: [ConfigModule, DatabaseModule, ProductsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/index.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}

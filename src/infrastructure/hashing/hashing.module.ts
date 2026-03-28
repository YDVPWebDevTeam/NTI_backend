import { Module } from '@nestjs/common';
import { ConfigModule } from '../config';
import { HashingService } from './hashing.service';

@Module({
  imports: [ConfigModule],
  providers: [HashingService],
  exports: [HashingService],
})
export class HashingModule {}

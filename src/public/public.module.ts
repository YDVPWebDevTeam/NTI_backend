import { Module } from '@nestjs/common';
import { CallsRepository } from '../applications/calls.repository';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  controllers: [PublicController],
  providers: [PublicService, CallsRepository],
})
export class PublicModule {}

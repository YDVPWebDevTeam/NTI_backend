import { Module } from '@nestjs/common';
import { HashingModule } from '../infrastructure/hashing';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [HashingModule],
  providers: [UserRepository, UserService],
  exports: [UserService],
})
export class UserModule {}

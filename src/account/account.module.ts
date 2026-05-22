import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { HashingModule } from '../infrastructure/hashing';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { EmailChangeTokenRepository } from './email-change-token.repository';
import { EmailChangeTokenService } from './email-change-token.service';

@Module({
  imports: [AuthModule, UserModule, HashingModule],
  controllers: [AccountController],
  providers: [
    AccountService,
    EmailChangeTokenRepository,
    EmailChangeTokenService,
  ],
})
export class AccountModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { AdminUniversityEmailDomainsController } from './admin-university-email-domains.controller';
import { UniversityEmailDomainController } from './university-email-domain.controller';
import { UniversityEmailDomainRepository } from './university-email-domain.repository';
import { UniversityEmailDomainService } from './university-email-domain.service';

@Module({
  imports: [AuthModule, UserModule],
  controllers: [
    UniversityEmailDomainController,
    AdminUniversityEmailDomainsController,
  ],
  providers: [UniversityEmailDomainService, UniversityEmailDomainRepository],
  exports: [UniversityEmailDomainService],
})
export class UniversityEmailDomainModule {}

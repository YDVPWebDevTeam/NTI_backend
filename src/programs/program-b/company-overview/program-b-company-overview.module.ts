import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module';
import { UserRepository } from '../../../user/user.repository';
import { ProgramBCompanyOverviewController } from './program-b-company-overview.controller';
import { ProgramBCompanyOverviewService } from './program-b-company-overview.service';

@Module({
  imports: [AuthModule],
  controllers: [ProgramBCompanyOverviewController],
  providers: [ProgramBCompanyOverviewService, UserRepository],
  exports: [ProgramBCompanyOverviewService],
})
export class ProgramBCompanyOverviewModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationRulesService } from './application-rules.service';
import { ApplicationsRepository } from './applications.repository';
import { ApplicationsService } from './applications.service';
import { CallsRepository } from './calls.repository';

@Module({
  imports: [AuthModule],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsRepository,
    CallsRepository,
    ApplicationRulesService,
    ApplicationsService,
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

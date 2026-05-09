import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ApplicationSectionsRepository } from './application-sections.repository';
import { ApplicationSectionsService } from './application-sections.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationsRepository } from './applications.repository';
import { ApplicationsService } from './applications.service';
import { CallsRepository } from './calls.repository';
import { ApplicationRulesService } from './rules/application-rules.service';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [AuthModule, TeamModule],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsRepository,
    ApplicationSectionsRepository,
    CallsRepository,
    ApplicationRulesService,
    ApplicationsService,
    ApplicationSectionsService,
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

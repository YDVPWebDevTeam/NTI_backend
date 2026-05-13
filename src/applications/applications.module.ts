import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files';
import { TeamModule } from '../team/team.module';
import { ApplicationDocumentsRepository } from './application-documents.repository';
import { ApplicationsController } from './applications.controller';
import { ApplicationsRepository } from './applications.repository';
import { ApplicationsService } from './applications.service';
import { CallsDocumentsController } from './calls-documents.controller';
import { CallsRepository } from './calls.repository';
import { ApplicationRulesService } from './rules/application-rules.service';
import { NeedsInfoRepository } from './needs-info.repository';
import { EligibilitySignalsModule } from './eligibility-signals.module';
import { AdminApplicationsController } from './admin-applications.controller';
import { ApplicationSectionsRepository } from './application-sections.repository';
import { ProgramAMentorshipRepository } from './program-a-mentorship.repository';
import { UserRepository } from '../user/user.repository';
import { ApplicationSectionsRulesService } from './rules/application-sections-rules.service';
import { ApplicationSectionsService } from './application-sections.service';

@Module({
  imports: [AuthModule, TeamModule, FilesModule, EligibilitySignalsModule],
  controllers: [
    ApplicationsController,
    AdminApplicationsController,
    CallsDocumentsController,
  ],
  providers: [
    NeedsInfoRepository,
    ApplicationsRepository,
    ApplicationSectionsRepository,
    ApplicationDocumentsRepository,
    CallsRepository,
    ProgramAMentorshipRepository,
    UserRepository,
    ApplicationRulesService,
    ApplicationSectionsRulesService,
    ApplicationsService,
    ApplicationSectionsService,
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

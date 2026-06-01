import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files';
import { TeamModule } from '../team/team.module';
import { ApplicationDocumentsRepository } from './documents/application-documents.repository';
import { AdminCallsController } from './calls/admin-calls.controller';
import { AdminCallsService } from './calls/admin-calls.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationsRepository } from './applications.repository';
import { ApplicationsService } from './applications.service';
import { CallsDocumentsController } from './calls/calls-documents.controller';
import { CallsRepository } from './calls/calls.repository';
import { CallsService } from './calls/calls.service';
import { ApplicationRulesService } from './rules/application-rules.service';
import { ApplicationAccessService } from './application-access.service';
import { ProgramAMentorshipService } from '../programs/program-a/program-a-mentorship.service';
import { ProgramAMilestonesService } from '../programs/program-a/program-a-milestones.service';
import { NeedsInfoRepository } from './needs-info/needs-info.repository';
import { EligibilitySignalsModule } from './eligibility-signals/eligibility-signals.module';
import { AdminApplicationsController } from './admin/admin-applications.controller';
import { ApplicationSectionsRepository } from './sections/application-sections.repository';
import { ProgramAMentorshipRepository } from '../programs/program-a/program-a-mentorship.repository';
import { UserRepository } from '../user/user.repository';
import { ApplicationSectionsRulesService } from './rules/application-sections-rules.service';
import { ApplicationSectionsService } from './sections/application-sections.service';
import { ApplicationEvaluationsRepository } from './evaluations/application-evaluations.repository';
import { ProgramAMilestonesRepository } from '../programs/program-a/program-a-milestones.repository';

@Module({
  imports: [AuthModule, TeamModule, FilesModule, EligibilitySignalsModule],
  controllers: [
    ApplicationsController,
    AdminApplicationsController,
    AdminCallsController,
    CallsDocumentsController,
  ],
  providers: [
    NeedsInfoRepository,
    ApplicationsRepository,
    ApplicationSectionsRepository,
    ApplicationDocumentsRepository,
    CallsRepository,
    CallsService,
    ProgramAMentorshipRepository,
    ProgramAMilestonesRepository,
    UserRepository,
    ApplicationRulesService,
    ApplicationAccessService,
    ProgramAMentorshipService,
    ProgramAMilestonesService,
    ApplicationSectionsRulesService,
    AdminCallsService,
    ApplicationsService,
    ApplicationSectionsService,
    ApplicationEvaluationsRepository,
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

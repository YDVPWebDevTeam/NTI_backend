import { Module } from '@nestjs/common';
import { AdminApplicationsController } from './admin-applications.controller';
import { NeedsInfoRepository } from './needs-info.repository';
import { AuthModule } from '../auth/auth.module';
import { ApplicationSectionsRepository } from './application-sections.repository';
import { ApplicationSectionsService } from './application-sections.service';
import { FilesModule } from '../files/files.module';
import { UserRepository } from '../user/user.repository';
import { CallsDocumentsController } from './calls-documents.controller';
import { ApplicationsController } from './applications.controller';
import { ApplicationDocumentsRepository } from './application-documents.repository';
import { ApplicationsRepository } from './applications.repository';
import { ApplicationsService } from './applications.service';
import { CallsRepository } from './calls.repository';
import { ProgramAMentorshipRepository } from './program-a-mentorship.repository';
import { ApplicationRulesService } from './rules/application-rules.service';
import { ApplicationSectionsRulesService } from './rules/application-sections-rules.service';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [AuthModule, TeamModule, FilesModule],
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

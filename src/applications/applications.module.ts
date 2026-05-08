import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { TeamModule } from '../team/team.module';
import { ApplicationDocumentsRepository } from './application-documents.repository';
import { ApplicationRulesService } from './application-rules.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationsRepository } from './applications.repository';
import { ApplicationsService } from './applications.service';
import { CallsDocumentsController } from './calls-documents.controller';
import { CallsRepository } from './calls.repository';
import { EligibilitySignalsModule } from './eligibility-signals.module';
import { NeedsInfoRepository } from './needs-info.repository';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => TeamModule),
    FilesModule,
    EligibilitySignalsModule,
  ],
  controllers: [ApplicationsController, CallsDocumentsController],
  providers: [
    NeedsInfoRepository,
    ApplicationsRepository,
    ApplicationDocumentsRepository,
    CallsRepository,
    ApplicationRulesService,
    ApplicationsService,
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

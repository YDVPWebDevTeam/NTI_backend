import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { CallsDocumentsController } from './calls-documents.controller';
import { ApplicationsController } from './applications.controller';
import { ApplicationDocumentsRepository } from './application-documents.repository';
import { ApplicationRulesService } from './application-rules.service';
import { ApplicationsRepository } from './applications.repository';
import { ApplicationsService } from './applications.service';
import { CallsRepository } from './calls.repository';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [AuthModule, TeamModule, FilesModule],
  controllers: [ApplicationsController, CallsDocumentsController],
  providers: [
    ApplicationsRepository,
    ApplicationDocumentsRepository,
    CallsRepository,
    ApplicationRulesService,
    ApplicationsService,
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

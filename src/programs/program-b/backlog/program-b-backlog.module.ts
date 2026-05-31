import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module';
import { FilesModule } from '../../../files';
import { StorageModule } from '../../../infrastructure/storage';
import { OrganizationRepository } from '../../../organization/organization.repository';
import { UserRepository } from '../../../user/user.repository';
import { CallsRepository } from '../../../applications/calls.repository';
import { ProgramBProjectsRepository } from '../projects/program-b-projects.repository';
import { ProgramBTeamApplicationRepository } from '../team-application/program-b-team-application.repository';
import { ProgramBBacklogController } from './program-b-backlog.controller';
import { ProgramBBacklogRepository } from './program-b-backlog.repository';
import { ProgramBBacklogService } from './program-b-backlog.service';

@Module({
  imports: [AuthModule, FilesModule, StorageModule],
  controllers: [ProgramBBacklogController],
  providers: [
    ProgramBBacklogService,
    ProgramBBacklogRepository,
    OrganizationRepository,
    UserRepository,
    CallsRepository,
    ProgramBTeamApplicationRepository,
    ProgramBProjectsRepository,
  ],
  exports: [ProgramBBacklogService],
})
export class ProgramBBacklogModule {}

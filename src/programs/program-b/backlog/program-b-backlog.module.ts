import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module';
import { OrganizationRepository } from '../../../organization/organization.repository';
import { UserRepository } from '../../../user/user.repository';
import { ProgramBProjectsRepository } from '../projects/program-b-projects.repository';
import { ProgramBTeamApplicationRepository } from '../team-application/program-b-team-application.repository';
import { ProgramBBacklogController } from './program-b-backlog.controller';
import { ProgramBBacklogRepository } from './program-b-backlog.repository';
import { ProgramBBacklogService } from './program-b-backlog.service';

@Module({
  imports: [AuthModule],
  controllers: [ProgramBBacklogController],
  providers: [
    ProgramBBacklogService,
    ProgramBBacklogRepository,
    OrganizationRepository,
    UserRepository,
    ProgramBTeamApplicationRepository,
    ProgramBProjectsRepository,
  ],
  exports: [ProgramBBacklogService],
})
export class ProgramBBacklogModule {}

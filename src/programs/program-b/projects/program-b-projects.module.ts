import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module';
import { UserRepository } from '../../../user/user.repository';
import { ProgramBProjectsController } from './program-b-projects.controller';
import { ProgramBProjectsRepository } from './program-b-projects.repository';
import { ProgramBProjectsService } from './program-b-projects.service';
import { TeamRepository } from '../../../team/team.repository';

@Module({
  imports: [AuthModule],
  controllers: [ProgramBProjectsController],
  providers: [
    ProgramBProjectsService,
    ProgramBProjectsRepository,
    UserRepository,
    TeamRepository,
  ],
})
export class ProgramBProjectsModule {}

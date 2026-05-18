import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module';
import { ProgramBProjectsController } from './program-b-projects.controller';
import { ProgramBProjectsRepository } from './program-b-projects.repository';
import { ProgramBProjectsService } from './program-b-projects.service';
import { UserRepository } from '../../../user/user.repository';

@Module({
  imports: [AuthModule],
  controllers: [ProgramBProjectsController],
  providers: [
    ProgramBProjectsService,
    ProgramBProjectsRepository,
    UserRepository,
  ],
})
export class ProgramBProjectsModule {}

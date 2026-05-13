import { Module } from '@nestjs/common';
import { ProgramBTeamApplicationService } from './program-b-team-application.service';
import { ProgramBTeamApplicationController } from './program-b-team-application.controller';
import { ProgramBTeamApplicationWithdrawalController } from './program-b-team-application-withdrawal.controller';
import { TeamModule } from '../../../team/team.module';
import { FilesModule } from '../../../files/files.module';
import { DatabaseModule } from '../../../infrastructure/database/database.module';
import { ProgramBBacklogModule } from '../backlog/program-b-backlog.module';

@Module({
  imports: [TeamModule, FilesModule, DatabaseModule, ProgramBBacklogModule],
  providers: [ProgramBTeamApplicationService],
  controllers: [
    ProgramBTeamApplicationController,
    ProgramBTeamApplicationWithdrawalController,
  ],
})
export class ProgramBTeamApplicationModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeamLeadGuard } from '../auth/guards/team-lead.guard';
import { HashingModule } from '../infrastructure/hashing';
import { QueueModule } from '../infrastructure/queue';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [AuthModule, HashingModule, QueueModule],
  controllers: [TeamController],
  providers: [TeamService, TeamLeadGuard],
})
export class TeamModule {}

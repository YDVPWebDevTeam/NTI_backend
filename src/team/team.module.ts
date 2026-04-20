import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TeamLeadGuard } from '../auth/guards/team-lead.guard';
import { ConfigModule } from '../infrastructure/config';
import { HashingModule } from '../infrastructure/hashing';
import { QueueModule } from '../infrastructure/queue';
import { InvitationController } from './invitations/invitation.controller';
import { InvitationRepository } from './invitations/invitation.repository';
import { InvitationService } from './invitations/invitation.service';
import { TeamController } from './team.controller';
import { TeamRepository } from './team.repository';
import { TeamService } from './team.service';

@Module({
  imports: [AuthModule, ConfigModule, HashingModule, QueueModule],
  controllers: [TeamController, InvitationController],
  providers: [
    TeamService,
    TeamRepository,
    InvitationRepository,
    InvitationService,
    TeamLeadGuard,
    RolesGuard,
  ],
})
export class TeamModule {}

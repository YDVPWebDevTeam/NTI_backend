import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TeamLeadGuard } from '../auth/guards/team-lead.guard';
import { InvitationTokenService } from '../common/invitations/invitation-token.service';
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
  imports: [ConfigModule, HashingModule, QueueModule],
  controllers: [TeamController, InvitationController],
  providers: [
    TeamService,
    TeamRepository,
    InvitationRepository,
    InvitationService,
    InvitationTokenService,
    TeamLeadGuard,
    RolesGuard,
  ],
  exports: [TeamRepository, InvitationService],
})
export class TeamModule {}

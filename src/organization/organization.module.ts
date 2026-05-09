import { Module } from '@nestjs/common';
import { InvitationTokenService } from 'src/common/invitations/invitation-token.service';
import { HashingModule } from 'src/infrastructure/hashing';
import { QueueModule } from 'src/infrastructure/queue';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { OrganizationRepository } from './organization.repository';
import { UserRepository } from 'src/user/user.repository';
import { OrganizationInviteRepository } from './organization-invitation.repository';

@Module({
  imports: [HashingModule, QueueModule],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    OrganizationRepository,
    OrganizationInviteRepository,
    UserRepository,
    InvitationTokenService,
  ],
})
export class OrganizationModule {}

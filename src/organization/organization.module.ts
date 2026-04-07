import { Module } from '@nestjs/common';
import { QueueModule } from 'src/infrastructure/queue';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { OrganizationRepository } from './organization.repository';
import { UserRepository } from 'src/user/user.repository';
import { OrganizationInvitationRepository } from './organization-invitation/organization-invitation.repository';
import { OrganizationInvitationService } from './organization-invitation/organization-invitation.service';

@Module({
  imports: [QueueModule],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    OrganizationRepository,
    UserRepository,
    OrganizationInvitationRepository,
    OrganizationInvitationService,
  ],
})
export class OrganizationModule {}

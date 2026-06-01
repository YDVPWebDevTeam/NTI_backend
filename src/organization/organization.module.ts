import { Module } from '@nestjs/common';
import { InvitationTokenService } from 'src/common/invitations/invitation-token.service';
import { HashingModule } from 'src/infrastructure/hashing';
import { QueueModule } from 'src/infrastructure/queue';
import { OrganizationDocumentsController } from './documents/organization-documents.controller';
import { OrganizationDocumentsRepository } from './documents/organization-documents.repository';
import { OrganizationDocumentsService } from './documents/organization-documents.service';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { OrganizationAccessService } from './organization-access.service';
import { OrganizationInviteService } from './organization-invite.service';
import { OrganizationRepository } from './organization.repository';
import { UserRepository } from 'src/user/user.repository';
import { OrganizationInviteRepository } from './organization-invitation.repository';

@Module({
  imports: [HashingModule, QueueModule],
  controllers: [OrganizationController, OrganizationDocumentsController],
  providers: [
    OrganizationService,
    OrganizationAccessService,
    OrganizationInviteService,
    OrganizationDocumentsService,
    OrganizationRepository,
    OrganizationDocumentsRepository,
    OrganizationInviteRepository,
    UserRepository,
    InvitationTokenService,
  ],
  exports: [OrganizationInviteService],
})
export class OrganizationModule {}

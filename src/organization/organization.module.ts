import { Module } from '@nestjs/common';
import { InvitationTokenService } from 'src/common/invitations/invitation-token.service';
import { HashingModule } from 'src/infrastructure/hashing';
import { QueueModule } from 'src/infrastructure/queue';
import { StorageModule } from 'src/infrastructure/storage';
import { OrganizationDocumentsController } from './documents/organization-documents.controller';
import { OrganizationDocumentsRepository } from './documents/organization-documents.repository';
import { OrganizationDocumentsService } from './documents/organization-documents.service';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { OrganizationRepository } from './organization.repository';
import { UserRepository } from 'src/user/user.repository';
import { OrganizationInviteRepository } from './organization-invitation.repository';

@Module({
  imports: [HashingModule, QueueModule, StorageModule],
  controllers: [OrganizationController, OrganizationDocumentsController],
  providers: [
    OrganizationService,
    OrganizationDocumentsService,
    OrganizationRepository,
    OrganizationDocumentsRepository,
    OrganizationInviteRepository,
    UserRepository,
    InvitationTokenService,
  ],
})
export class OrganizationModule {}

import { Module } from '@nestjs/common';
import { QueueModule } from 'src/infrastructure/queue';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { OrganizationRepository } from './organization.repository';
import { UserRepository } from 'src/user/user.repository';
import { OrganizationInviteRepository } from './organization-invitation.repository';

@Module({
  imports: [QueueModule],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    OrganizationRepository,
    OrganizationInviteRepository,
    UserRepository,
  ],
})
export class OrganizationModule {}

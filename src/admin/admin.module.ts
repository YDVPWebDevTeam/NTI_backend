import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HashingModule } from '../infrastructure/hashing';
import { OrganizationRepository } from '../organization/organization.repository';
import { UserRepository } from '../user/user.repository';
import { UserModule } from '../user/user.module';
import { AdminAcademicStructureController } from './academic-structure/admin-academic-structure.controller';
import { AdminAcademicStructureRepository } from './academic-structure/admin-academic-structure.repository';
import { AdminAcademicStructureService } from './academic-structure/admin-academic-structure.service';
import { AdminOrgInvitesController } from './organizations/admin-org-invites.controller';
import { AdminOrgInvitesService } from './organizations/admin-org-invites.service';
import { AdminOrganizationsController } from './organizations/admin-organizations.controller';
import { AdminOrganizationsService } from './organizations/admin-organizations.service';
import { AdminInvitesController } from './system-invites/admin-invites.controller';
import { AdminInvitesService } from './system-invites/admin-invites.service';
import { SystemInvitationRepository } from './system-invites/system-invitation.repository';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

@Module({
  imports: [AuthModule, HashingModule, UserModule],
  controllers: [
    AdminUsersController,
    AdminInvitesController,
    AdminOrganizationsController,
    AdminOrgInvitesController,
    AdminAcademicStructureController,
  ],
  providers: [
    AdminUsersService,
    AdminInvitesService,
    AdminOrganizationsService,
    AdminOrgInvitesService,
    SystemInvitationRepository,
    OrganizationRepository,
    UserRepository,
    AdminAcademicStructureService,
    AdminAcademicStructureRepository,
  ],
})
export class AdminModule {}

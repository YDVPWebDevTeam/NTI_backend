import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HashingModule } from '../infrastructure/hashing';
import { UserModule } from '../user/user.module';
import { AdminInvitesController } from './admin-invites.controller';
import { AdminInvitesService } from './admin-invites.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { SystemInvitationRepository } from './system-invitation.repository';

@Module({
  imports: [AuthModule, HashingModule, UserModule],
  controllers: [AdminUsersController, AdminInvitesController],
  providers: [
    AdminUsersService,
    AdminInvitesService,
    SystemInvitationRepository,
  ],
})
export class AdminModule {}

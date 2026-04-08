import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesRepository } from './invites.repository';
import { InvitesService } from './invites.service';

@Module({
  controllers: [InvitesController],
  providers: [InvitesRepository, InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}

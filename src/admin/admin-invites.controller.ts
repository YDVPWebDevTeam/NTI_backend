import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { CreateSystemInviteApi } from './api-docs/admin-invites-api-docs.decorators';
import { AdminInvitesService } from './admin-invites.service';
import { CreateSystemInviteDto } from './dto/create-system-invite.dto';
import { SystemInviteResponseDto } from './dto/system-invite-response.dto';

@ApiTags('Admin Invites')
@Controller('admin/invites')
export class AdminInvitesController {
  constructor(private readonly adminInvitesService: AdminInvitesService) {}

  @CreateSystemInviteApi()
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  createInvite(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Body() dto: CreateSystemInviteDto,
  ): Promise<SystemInviteResponseDto> {
    return this.adminInvitesService.createInvite(actor, dto);
  }
}

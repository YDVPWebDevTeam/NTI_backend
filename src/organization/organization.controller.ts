import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'generated/prisma/enums';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { GetUserContext } from 'src/auth/decorators/get-user-context.decorator';
import type { AuthenticatedUserContext } from 'src/common/types/auth-user-context.type';
import { CreateOrgInviteDto } from './dto/create-org-invitation.dto';
import { OrganizationInvitationService } from './organization-invitation/organization-invitation.service';

@Controller('/organizations')
export class OrganizationController {
  constructor(
    private readonly service: OrganizationService,
    private readonly invitationService: OrganizationInvitationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  async create(
    @Body() dto: CreateOrganizationDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.service.create(dto, user);
  }

  @Post(':id/invites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  async createInvite(
    @Param('id') orgId: string,
    @Body() dto: CreateOrgInviteDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.invitationService.createInvite(orgId, dto, user);
  }
}

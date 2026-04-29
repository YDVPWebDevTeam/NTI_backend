import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUserContext } from '../../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import {
  GetAllOrgInvitesApi,
  GetOrganizationInvitesApi,
} from './api-docs/admin-org-invites-api-docs.decorators';
import { AdminOrgInvitesService } from './admin-org-invites.service';
import { OrganizationStatusResponseDto } from './dto/organization-status-response.dto';

@ApiTags('Admin')
@Controller('admin/organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminOrgInvitesController {
  constructor(
    private readonly adminOrgInvitesService: AdminOrgInvitesService,
  ) {}

  @GetAllOrgInvitesApi()
  @Get('invites')
  listAll(
    @GetUserContext() actor: AuthenticatedUserContext,
  ): Promise<OrganizationStatusResponseDto[]> {
    return this.adminOrgInvitesService.listAll(actor);
  }

  @GetOrganizationInvitesApi()
  @Get(':id/invites')
  listByOrganization(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) organizationId: string,
  ): Promise<OrganizationStatusResponseDto[]> {
    return this.adminOrgInvitesService.listByOrganization(
      actor,
      organizationId,
    );
  }
}

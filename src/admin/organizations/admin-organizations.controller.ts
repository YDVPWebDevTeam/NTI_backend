import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
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
  GetAdminOrganizationApi,
  GetAdminOrganizationsApi,
  UpdateOrganizationStatusApi,
} from './api-docs/admin-organizations-api-docs.decorators';
import { AdminOrganizationsService } from './admin-organizations.service';
import { AdminOrganizationResponseDto } from './dto/admin-organization-response.dto';
import { OrganizationStatusResponseDto } from './dto/organization-status-response.dto';
import { UpdateOrgStatusDto } from './dto/update-org-status.dto';
import { ListOrganizationsQueryDto } from './dto/list-organizations-query.dto';
import type { ListOrganizationsResponseDto } from './dto/list-organizations-response.dto';

@ApiTags('Admin')
@Controller('admin/organizations')
export class AdminOrganizationsController {
  constructor(
    private readonly adminOrganizationsService: AdminOrganizationsService,
  ) {}

  @GetAdminOrganizationsApi()
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getOrganizations(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Query() query: ListOrganizationsQueryDto,
  ): Promise<ListOrganizationsResponseDto> {
    return this.adminOrganizationsService.listOrganizations(actor, query);
  }

  @GetAdminOrganizationApi()
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getOrganization(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) organizationId: string,
  ): Promise<AdminOrganizationResponseDto> {
    return this.adminOrganizationsService.getOrganization(
      actor,
      organizationId,
    );
  }

  @UpdateOrganizationStatusApi()
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  updateStatus(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdateOrgStatusDto,
  ): Promise<OrganizationStatusResponseDto> {
    return this.adminOrganizationsService.updateStatus(
      actor,
      organizationId,
      dto,
    );
  }
}

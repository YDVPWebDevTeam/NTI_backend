import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma/enums';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUserContext } from 'src/auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { AuthenticatedUserContext } from 'src/common/types/auth-user-context.type';
import { OrganizationService } from './organization.service';
import {
  CreateOrganizationApi,
  CreateOrganizationInviteApi,
  GetMyOrganizationApi,
  GetOrganizationInvitesApi,
  ResendOrganizationInviteApi,
  RevokeOrganizationInviteApi,
  UpdateMyOrganizationApi,
} from './api-docs';
import { CreateOrganizationInviteDto } from './dto/create-organization-invite.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { GetOrganizationInvitesQueryDto } from './dto/get-organization-invites-query.dto';
import { GetOrganizationInvitesResponseDto } from './dto/get-organization-invites-response.dto';
import { OrganizationInviteResponseDto } from './dto/organization-invite-response.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { ResendOrganizationInviteResponseDto } from './dto/resend-organization-invite-response.dto';
import { RevokeOrganizationInviteResponseDto } from './dto/revoke-organization-invite-response.dto';
import { UpdateOrganizationProfileDto } from './dto/update-organization-profile.dto';

@ApiTags('Organizations')
@Controller('/organizations')
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Get('me')
  @GetMyOrganizationApi()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  async getMyOrganization(
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationResponseDto> {
    return this.service.getMyOrganization(user);
  }

  @Patch('me')
  @UpdateMyOrganizationApi()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  async updateMyOrganization(
    @Body() dto: UpdateOrganizationProfileDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationResponseDto> {
    return this.service.updateMyOrganization(dto, user);
  }

  @Post()
  @CreateOrganizationApi()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  async create(
    @Body() dto: CreateOrganizationDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationResponseDto> {
    return this.service.create(dto, user);
  }

  @Post(':id/invites')
  @CreateOrganizationInviteApi()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  async createInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOrganizationInviteDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationInviteResponseDto> {
    return this.service.createInvite(id, dto, user);
  }

  @Get(':id/invites')
  @GetOrganizationInvitesApi()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  async listInvites(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetOrganizationInvitesQueryDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<GetOrganizationInvitesResponseDto> {
    return this.service.listInvites(id, query, user);
  }

  @Delete(':id/invites/:inviteId')
  @RevokeOrganizationInviteApi()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  async revokeInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<RevokeOrganizationInviteResponseDto> {
    return this.service.revokeInvite(id, inviteId, user);
  }

  @Post(':id/invites/:inviteId/resend')
  @ResendOrganizationInviteApi()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  async resendInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ResendOrganizationInviteResponseDto> {
    return this.service.resendInvite(id, inviteId, user);
  }
}

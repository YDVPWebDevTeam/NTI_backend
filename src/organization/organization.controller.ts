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
  AcceptOrganizationInviteApi,
  CreateOrganizationApi,
  CreateOrganizationInviteApi,
  GetMyOrganizationApi,
  GetOrganizationInvitesApi,
  ListOrganizationMembersApi,
  RemoveOrganizationMemberApi,
  ResendOrganizationInviteApi,
  RevokeOrganizationInviteApi,
  TransferOrganizationOwnerApi,
  UpdateMyOrganizationApi,
  UpdateOrganizationMemberRoleApi,
  ValidateOrganizationInviteApi,
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
import { OrganizationMemberResponseDto } from './dto/organization-member-response.dto';
import { TransferOrganizationOwnerDto } from './dto/transfer-organization-owner.dto';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { ValidateOrganizationInviteDto } from './dto/validate-organization-invite.dto';
import { OrganizationInviteValidationResponseDto } from './dto/organization-invite-validation-response.dto';

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

  @Post('invites/validate')
  @ValidateOrganizationInviteApi()
  async validateInvite(
    @Body() dto: ValidateOrganizationInviteDto,
  ): Promise<OrganizationInviteValidationResponseDto> {
    return this.service.validateInviteToken(dto.token);
  }

  @Post('invites/accept')
  @AcceptOrganizationInviteApi()
  @UseGuards(JwtAuthGuard)
  async acceptInvite(
    @Body() dto: ValidateOrganizationInviteDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto> {
    return this.service.acceptInvite(dto.token, user);
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

  @Get(':id/members')
  @ListOrganizationMembersApi()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  async listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto[]> {
    return this.service.listMembers(id, user);
  }

  @Patch(':id/members/:userId/role')
  @UpdateOrganizationMemberRoleApi()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  async updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateOrganizationMemberRoleDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto> {
    return this.service.updateMemberRole(id, userId, dto, user);
  }

  @Delete(':id/members/:userId')
  @RemoveOrganizationMemberApi()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto> {
    return this.service.removeMember(id, userId, user);
  }

  @Patch(':id/owner')
  @TransferOrganizationOwnerApi()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  async transferOwner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOrganizationOwnerDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationMemberResponseDto> {
    return this.service.transferOwner(id, dto, user);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'generated/prisma/enums';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { GetUserContext } from 'src/auth/decorators/get-user-context.decorator';
import type { AuthenticatedUserContext } from 'src/common/types/auth-user-context.type';
import { CreateOrganizationInviteDto } from './dto/create-organization-invite.dto';
import {
  CreateOrganizationApi,
  CreateOrganizationInviteApi,
  GetMyOrganizationApi,
  UpdateMyOrganizationApi,
} from './api-docs';
import { OrganizationInviteResponseDto } from './dto/organization-invite-response.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
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
}

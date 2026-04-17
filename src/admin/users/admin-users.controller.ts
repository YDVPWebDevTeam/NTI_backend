import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
  GetUserByIdAdminApi,
  GetUsersAdminApi,
  UpdateUserStatusApi,
} from './api-docs/admin-users-api-docs.decorators';
import { AdminUsersService } from './admin-users.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('Admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @GetUsersAdminApi()
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getUsers(
    @GetUserContext() actor: AuthenticatedUserContext,
  ): Promise<AuthenticatedUserContext[]> {
    return this.adminUsersService.getUsers(actor);
  }

  @GetUserByIdAdminApi()
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getUserById(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) targetUserId: string,
  ): Promise<AuthenticatedUserContext> {
    return this.adminUsersService.getUserById(actor, targetUserId);
  }

  @UpdateUserStatusApi()
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  updateStatus(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<AuthenticatedUserContext> {
    return this.adminUsersService.updateStatus(actor, targetUserId, dto.status);
  }
}

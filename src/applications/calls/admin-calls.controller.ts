import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums';
import { GetUserContext } from '../../auth/decorators/get-user-context.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { AdminCallsService } from './admin-calls.service';
import { AdminCallDto } from '../dto/admin-call.dto';
import { AdminCallsQueryDto } from '../dto/admin-calls-query.dto';
import { AdminCallsResponseDto } from '../dto/admin-calls-response.dto';
import { CreateAdminCallDto } from '../dto/create-admin-call.dto';
import { UpdateAdminCallDto } from '../dto/update-admin-call.dto';

@ApiTags('Admin')
@Controller('admin/calls')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminCallsController {
  constructor(private readonly adminCallsService: AdminCallsService) {}

  @Post()
  create(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Body() dto: CreateAdminCallDto,
  ): Promise<AdminCallDto> {
    return this.adminCallsService.createCall(actor, dto);
  }

  @Get()
  list(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Query() query: AdminCallsQueryDto,
  ): Promise<AdminCallsResponseDto> {
    return this.adminCallsService.listCalls(actor, query);
  }

  @Get(':id')
  getById(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminCallDto> {
    return this.adminCallsService.getCall(actor, id);
  }

  @Patch(':id')
  update(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminCallDto,
  ): Promise<AdminCallDto> {
    return this.adminCallsService.updateCall(actor, id, dto);
  }

  @Post(':id/open')
  @HttpCode(HttpStatus.OK)
  open(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminCallDto> {
    return this.adminCallsService.openCall(actor, id);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  close(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminCallDto> {
    return this.adminCallsService.closeCall(actor, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminCallDto> {
    return this.adminCallsService.archiveCall(actor, id);
  }
}

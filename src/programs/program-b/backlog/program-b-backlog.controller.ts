import {
  Body,
  Controller,
  Delete,
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
import { UserRole } from 'generated/prisma/enums';
import { GetUserContext } from '../../../auth/decorators/get-user-context.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../../../common/types/auth-user-context.type';
import {
  ArchiveProgramBBacklogItemApi,
  CreateProgramBBacklogItemApi,
  DeleteProgramBBacklogItemApi,
  ListMyProgramBBacklogItemsApi,
  PublishProgramBBacklogItemApi,
  UpdateProgramBBacklogItemApi,
} from './api-docs';
import { CreateProgramBBacklogItemDto } from './dto/create-program-b-backlog-item.dto';
import { GetProgramBBacklogQueryDto } from './dto/get-program-b-backlog-query.dto';
import { GetProgramBBacklogResponseDto } from './dto/get-program-b-backlog-response.dto';
import { ProgramBBacklogItemDto } from './dto/program-b-backlog-item.dto';
import { UpdateProgramBBacklogItemDto } from './dto/update-program-b-backlog-item.dto';
import { ProgramBBacklogService } from './program-b-backlog.service';

@ApiTags('Program B Backlog')
@Controller('program-b/backlog')
export class ProgramBBacklogController {
  constructor(private readonly backlogService: ProgramBBacklogService) {}

  @CreateProgramBBacklogItemApi()
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  create(
    @Body() dto: CreateProgramBBacklogItemDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.create(dto, user);
  }

  @UpdateProgramBBacklogItemApi()
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgramBBacklogItemDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.update(id, dto, user);
  }

  @DeleteProgramBBacklogItemApi()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.remove(id, user);
  }

  @ListMyProgramBBacklogItemsApi()
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  listMy(
    @Query() query: GetProgramBBacklogQueryDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<GetProgramBBacklogResponseDto> {
    return this.backlogService.listMy(query, user);
  }

  @PublishProgramBBacklogItemApi()
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.publish(id, user);
  }

  @ArchiveProgramBBacklogItemApi()
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.archive(id, user);
  }
}

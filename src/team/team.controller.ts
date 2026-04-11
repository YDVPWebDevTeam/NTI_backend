import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  CreateTeamApi,
  DeleteTeamApi,
  GetTeamApi,
  UpdateTeamApi,
} from './api-docs';
import { CreateTeamWithInvitesDto } from './dto/create-team-with-invites.dto';
import { TeamDetailDto } from './dto/team-detail.dto';
import { TeamPublicDto } from './dto/team-public.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamService } from './team.service';

@ApiTags('Teams')
@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @CreateTeamApi()
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: CreateTeamWithInvitesDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<TeamDetailDto> {
    return this.teamService.create(user, dto);
  }

  @GetTeamApi()
  @Get(':id')
  findById(@Param('id') id: string): Promise<TeamPublicDto> {
    return this.teamService.findPublicById(id);
  }

  @UpdateTeamApi()
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<TeamDetailDto> {
    return this.teamService.update(id, user.id, dto);
  }

  @DeleteTeamApi()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string): Promise<TeamPublicDto> {
    return this.teamService.remove(id);
  }
}

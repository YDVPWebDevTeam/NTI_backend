import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { TeamLeadGuard } from '../auth/guards/team-lead.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  CreateTeamApi,
  DeleteTeamApi,
  GetTeamApi,
  LeaveTeamApi,
  RemoveTeamMemberApi,
  TransferTeamLeadershipApi,
  UpdateTeamApi,
} from './api-docs';
import { CreateTeamWithInvitesDto } from './dto/create-team-with-invites.dto';
import { LeaveTeamResponseDto } from './dto/leave-team-response.dto';
import { RemoveTeamMemberResponseDto } from './dto/remove-team-member-response.dto';
import { TeamDetailDto } from './dto/team-detail.dto';
import { TeamPublicDto } from './dto/team-public.dto';
import { TeamSummaryResponseDto } from './dto/team-summary-response.dto';
import { TransferTeamLeadershipDto } from './dto/transfer-team-leadership.dto';
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
  @UseGuards(JwtAuthGuard)
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<TeamPublicDto> {
    return this.teamService.findPublicById(id);
  }

  @UpdateTeamApi()
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<TeamDetailDto> {
    return this.teamService.update(id, user.id, dto);
  }

  @DeleteTeamApi()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<TeamPublicDto> {
    return this.teamService.remove(id);
  }

  @RemoveTeamMemberApi()
  @Delete(':teamId/members/:memberId')
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  removeMember(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<RemoveTeamMemberResponseDto> {
    return this.teamService.removeMember(teamId, user.id, memberId);
  }

  @LeaveTeamApi()
  @Post(':teamId/leave')
  @UseGuards(JwtAuthGuard)
  leaveTeam(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<LeaveTeamResponseDto> {
    return this.teamService.leaveTeam(teamId, user.id);
  }

  @TransferTeamLeadershipApi()
  @Patch(':teamId/leader')
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  transferLeadership(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: TransferTeamLeadershipDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<TeamSummaryResponseDto> {
    return this.teamService.transferLeadership(
      teamId,
      user.id,
      dto.newLeaderId,
    );
  }
}

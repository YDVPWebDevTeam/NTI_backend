import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Team } from '../../generated/prisma/client';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamLeadGuard } from '../auth/guards/team-lead.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  LeaveTeamApi,
  RemoveTeamMemberApi,
  TransferTeamLeadershipApi,
} from './api-docs/team-membership-api-docs.decorators';
import { CreateTeamInvitesDto } from './dto/create-team-invites.dto';
import { LeaveTeamResponseDto } from './dto/leave-team-response.dto';
import { RemoveTeamMemberResponseDto } from './dto/remove-team-member-response.dto';
import { TeamSummaryResponseDto } from './dto/team-summary-response.dto';
import { TransferTeamLeadershipDto } from './dto/transfer-team-leadership.dto';
import { TeamService } from './team.service';

type TeamRequest = {
  team: Team;
};

@ApiTags('Teams')
@ApiBearerAuth('access-token')
@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post(':teamId/invites')
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  async createInvites(
    @Body() dto: CreateTeamInvitesDto,
    @Req() request: TeamRequest,
  ): Promise<{ createdCount: number }> {
    return this.teamService.createInvites(request.team, dto.emails);
  }

  @RemoveTeamMemberApi()
  @Delete(':teamId/members/:memberId')
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<RemoveTeamMemberResponseDto> {
    return this.teamService.removeMember(teamId, user.id, memberId);
  }

  @LeaveTeamApi()
  @Post(':teamId/leave')
  @UseGuards(JwtAuthGuard)
  async leaveTeam(
    @Param('teamId') teamId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<LeaveTeamResponseDto> {
    return this.teamService.leaveTeam(teamId, user.id);
  }

  @TransferTeamLeadershipApi()
  @Patch(':teamId/leader')
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  async transferLeadership(
    @Param('teamId') teamId: string,
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

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Team } from '../../generated/prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamLeadGuard } from '../auth/guards/team-lead.guard';
import { CreateTeamInvitesDto } from './dto/create-team-invites.dto';
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
}

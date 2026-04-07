import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Team } from '../../../generated/prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TeamLeadGuard } from '../../auth/guards/team-lead.guard';
import {
  AcceptInvitationApi,
  CreateTeamInvitesApi,
  RevokeTeamInvitationApi,
} from '../api-docs';
import { TeamService } from '../team.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateTeamInvitesResponseDto } from './dto/create-team-invites-response.dto';
import { CreateTeamInvitesDto } from './dto/create-team-invites.dto';
import { InvitationService } from './invitation.service';

type TeamRequest = {
  team: Team;
};

@ApiTags('Team Invitations')
@Controller()
export class InvitationController {
  constructor(
    private readonly teamService: TeamService,
    private readonly invitationService: InvitationService,
  ) {}

  @CreateTeamInvitesApi()
  @Post('teams/:teamId/invitations')
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  async createInvites(
    @Body() dto: CreateTeamInvitesDto,
    @Req() request: TeamRequest,
  ): Promise<CreateTeamInvitesResponseDto> {
    return this.teamService.createInvites(request.team, dto.emails);
  }

  @RevokeTeamInvitationApi()
  @Delete('teams/:teamId/invitations/:invitationId')
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  async revokeInvitation(
    @Param('invitationId') invitationId: string,
    @Req() request: TeamRequest,
  ) {
    return this.invitationService.revoke(request.team.id, invitationId);
  }

  @AcceptInvitationApi()
  @Post('invitations/accept')
  async accept(@Body() dto: AcceptInvitationDto) {
    return this.invitationService.accept(dto.token);
  }
}

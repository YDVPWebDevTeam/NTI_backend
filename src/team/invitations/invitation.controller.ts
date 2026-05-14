import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InvitationStatus, type Team } from '../../../generated/prisma/client';
import { GetUserContext } from '../../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TeamLeadGuard } from '../../auth/guards/team-lead.guard';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import {
  AcceptInvitationApi,
  CreateTeamInvitesApi,
  GetTeamInvitationsApi,
  ResendTeamInvitationApi,
  RevokeTeamInvitationApi,
} from '../api-docs';
import { TeamService } from '../team.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateTeamInvitesResponseDto } from './dto/create-team-invites-response.dto';
import { CreateTeamInvitesDto } from './dto/create-team-invites.dto';
import { GetTeamInvitesQueryDto } from './dto/get-team-invites-query.dto';
import { GetTeamInvitesResponseDto } from './dto/get-team-invites-response.dto';
import { ResendTeamInvitationResponseDto } from './dto/resend-team-invitation-response.dto';
import { RevokedInvitationDto } from './dto/revoked-invitation.dto';
import { TeamMemberDto } from './dto/team-member.dto';
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
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  async createInvites(
    @Body() dto: CreateTeamInvitesDto,
    @Req() request: TeamRequest,
  ): Promise<CreateTeamInvitesResponseDto> {
    return this.teamService.createInvites(request.team, dto.emails);
  }

  @GetTeamInvitationsApi()
  @Get('teams/:teamId/invitations')
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  listInvites(
    @Query() query: GetTeamInvitesQueryDto,
    @Req() request: TeamRequest,
  ): Promise<GetTeamInvitesResponseDto> {
    return this.invitationService.list(request.team.id, query);
  }

  @RevokeTeamInvitationApi()
  @Delete('teams/:teamId/invitations/:invitationId')
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  async revokeInvitation(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Req() request: TeamRequest,
  ): Promise<RevokedInvitationDto> {
    const invitation = await this.invitationService.revoke(
      request.team.id,
      invitationId,
    );

    return {
      id: invitation.id,
      email: invitation.email,
      status: InvitationStatus.REVOKED,
      revokedAt: invitation.revokedAt!,
    };
  }

  @ResendTeamInvitationApi()
  @Post('teams/:teamId/invitations/:invitationId/resend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  async resendInvitation(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Req() request: TeamRequest,
  ): Promise<ResendTeamInvitationResponseDto> {
    const invitation = await this.invitationService.resend(
      request.team,
      invitationId,
    );

    return {
      id: invitation.id,
      email: invitation.email,
      status: InvitationStatus.PENDING,
      expiresAt: invitation.expiresAt,
    };
  }

  @AcceptInvitationApi()
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async accept(
    @Body() dto: AcceptInvitationDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<TeamMemberDto> {
    return this.invitationService.accept(dto.token, user);
  }
}

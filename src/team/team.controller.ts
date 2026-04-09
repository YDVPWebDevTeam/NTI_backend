import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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

  @ApiOperation({
    summary: 'Create team invites',
    description:
      'Creates invitation records for the specified team and enqueues invitation emails for the provided addresses.',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Identifier of the team that will receive the invitations.',
    example: 'team-1',
  })
  @ApiBody({ type: CreateTeamInvitesDto })
  @ApiResponse({
    status: 201,
    description: 'Invitations were created successfully.',
    schema: {
      type: 'object',
      properties: {
        createdCount: {
          type: 'number',
          example: 2,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token is missing or invalid.',
  })
  @ApiForbiddenResponse({
    description: 'Current user is not the leader of the requested team.',
  })
  @ApiNotFoundResponse({
    description: 'Team was not found.',
  })
  @Post(':teamId/invites')
  @UseGuards(JwtAuthGuard, TeamLeadGuard)
  async createInvites(
    @Body() dto: CreateTeamInvitesDto,
    @Req() request: TeamRequest,
  ): Promise<{ createdCount: number }> {
    return this.teamService.createInvites(request.team, dto.emails);
  }
}

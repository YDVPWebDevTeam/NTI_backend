import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { CreateTeamWithInvitesDto } from '../dto/create-team-with-invites.dto';
import { TeamDetailDto } from '../dto/team-detail.dto';
import { TeamPublicDto } from '../dto/team-public.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { AcceptInvitationDto } from '../invitations/dto/accept-invitation.dto';
import { CreateTeamInvitesResponseDto } from '../invitations/dto/create-team-invites-response.dto';
import { CreateTeamInvitesDto } from '../invitations/dto/create-team-invites.dto';
import { TeamMemberDto } from '../invitations/dto/team-member.dto';

export const CreateTeamApi = () =>
  createApiDecorator({
    summary: 'Create team',
    description:
      'Creates a new team, automatically adds the authenticated user as the team leader and initial member, and enqueues invitation requests for at least two teammates.',
    body: CreateTeamWithInvitesDto,
    successResponse: {
      status: 201,
      type: TeamDetailDto,
      description: 'Team was created successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
    ],
  });

export const GetTeamApi = () =>
  createApiDecorator({
    summary: 'Get public team info',
    description:
      'Returns base team information that is safe to expose publicly.',
    successResponse: {
      status: 200,
      type: TeamPublicDto,
      description: 'Public team data.',
    },
    extraDecorators: [
      ApiParam({ name: 'id', description: 'Team identifier.' }),
    ],
    errors: [
      ApiNotFoundResponse({
        description: 'Team not found.',
      }),
    ],
  });

export const UpdateTeamApi = () =>
  createApiDecorator({
    summary: 'Update team',
    description:
      'Updates team metadata. Only the team leader may perform this action, and locked teams cannot be modified.',
    body: UpdateTeamDto,
    successResponse: {
      status: 200,
      type: TeamDetailDto,
      description: 'Team was updated successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({ name: 'id', description: 'Team identifier.' }),
    ],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only the team leader may update this team.',
      }),
    ],
  });

export const DeleteTeamApi = () =>
  createApiDecorator({
    summary: 'Delete team',
    description:
      'Deletes a team. This endpoint is restricted to administrators.',
    successResponse: {
      status: 200,
      description: 'Team was deleted successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({ name: 'id', description: 'Team identifier.' }),
    ],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators may delete teams.',
      }),
    ],
  });

export const CreateTeamInvitesApi = () =>
  createApiDecorator({
    summary: 'Create team invitations',
    description:
      'Creates invitations for a team and schedules invitation emails for the provided email addresses.',
    body: CreateTeamInvitesDto,
    successResponse: {
      status: 200,
      type: CreateTeamInvitesResponseDto,
      description: 'Invitations were created successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({ name: 'teamId', description: 'Team identifier.' }),
    ],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only the team leader may create invitations.',
      }),
    ],
  });

export const RevokeTeamInvitationApi = () =>
  createApiDecorator({
    summary: 'Revoke team invitation',
    description:
      'Revokes a pending team invitation so the token can no longer be used.',
    successResponse: {
      status: 200,
      description: 'Invitation was revoked successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({ name: 'teamId', description: 'Team identifier.' }),
      ApiParam({
        name: 'invitationId',
        description: 'Invitation identifier.',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only the team leader may revoke invitations.',
      }),
      ApiNotFoundResponse({
        description: 'Invitation not found.',
      }),
    ],
  });

export const AcceptInvitationApi = () =>
  createApiDecorator({
    summary: 'Accept invitation',
    description:
      'Accepts a team invitation using the token from the email link and adds the authenticated user to the team when the token email matches that user.',
    body: AcceptInvitationDto,
    successResponse: {
      status: 200,
      type: TeamMemberDto,
      description:
        'Invitation was accepted and the user was added to the team.',
    },
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'The invitation token does not belong to the authenticated user.',
      }),
      ApiNotFoundResponse({
        description: 'Invitation or team was not found.',
      }),
      ApiConflictResponse({
        description:
          'The invitation was already accepted, the user is already a team member, or the team is locked.',
      }),
      ApiGoneResponse({
        description: 'The invitation has expired or was revoked.',
      }),
    ],
    extraDecorators: [ApiBearerAuth('access-token')],
  });

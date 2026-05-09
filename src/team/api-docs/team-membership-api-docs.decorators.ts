import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { LeaveTeamResponseDto } from '../dto/leave-team-response.dto';
import { RemoveTeamMemberResponseDto } from '../dto/remove-team-member-response.dto';
import { TeamSummaryResponseDto } from '../dto/team-summary-response.dto';
import { TransferTeamLeadershipDto } from '../dto/transfer-team-leadership.dto';

const teamIdParam = ApiParam({
  name: 'teamId',
  description: 'Identifier of the team.',
  example: 'c2bb920c-a8cb-4d95-85be-13c6215fb9dd',
});

const invalidTeamIdResponse = ApiBadRequestResponse({
  description: 'Team identifier must be a valid UUID.',
});

export const RemoveTeamMemberApi = () =>
  createApiDecorator({
    summary: 'Remove a team member',
    description:
      'Allows the current team leader to remove a non-leader member from the team.',
    successResponse: {
      status: 200,
      type: RemoveTeamMemberResponseDto,
      description: 'The team member was removed successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      teamIdParam,
      ApiParam({
        name: 'memberId',
        description: 'Identifier of the member to remove.',
        example: '8b6d4c1b-5899-4f86-a0d4-b9504dd3d4b7',
      }),
    ],
    errors: [
      invalidTeamIdResponse,
      ApiBadRequestResponse({
        description: 'Member identifier must be a valid UUID.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Current user is not the leader of the requested team.',
      }),
      ApiNotFoundResponse({
        description: 'Team or team member was not found.',
      }),
      ApiConflictResponse({
        description:
          'Team is locked or the requested member is the current team leader.',
      }),
    ],
  });

export const LeaveTeamApi = () =>
  createApiDecorator({
    summary: 'Leave a team',
    description: 'Allows the current authenticated member to leave the team.',
    successResponse: {
      status: 200,
      type: LeaveTeamResponseDto,
      description: 'The authenticated user left the team successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token'), teamIdParam],
    errors: [
      invalidTeamIdResponse,
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiNotFoundResponse({
        description: 'Team or team membership was not found.',
      }),
      ApiConflictResponse({
        description:
          'Team is locked or the current leader must transfer leadership before leaving.',
      }),
    ],
  });

export const TransferTeamLeadershipApi = () =>
  createApiDecorator({
    summary: 'Transfer team leadership',
    description:
      'Allows the current team leader to transfer leadership to another current team member.',
    body: TransferTeamLeadershipDto,
    successResponse: {
      status: 200,
      type: TeamSummaryResponseDto,
      description: 'Leadership was transferred successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token'), teamIdParam],
    errors: [
      invalidTeamIdResponse,
      ApiBadRequestResponse({
        description: 'New leader identifier must be a valid UUID.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Current user is not the leader of the requested team.',
      }),
      ApiNotFoundResponse({
        description: 'Team or the requested new leader was not found.',
      }),
      ApiConflictResponse({
        description: 'Team is locked.',
      }),
    ],
  });

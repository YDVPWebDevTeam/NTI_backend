jest.mock('./team.service', () => ({
  TeamService: class TeamService {},
}));

jest.mock('../auth/guards/team-lead.guard', () => ({
  TeamLeadGuard: class TeamLeadGuard {},
}));

jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { TeamController } from './team.controller';
import { TeamService } from './team.service';

describe('TeamController', () => {
  let controller: TeamController;
  let teamService: {
    createInvites: jest.Mock;
  };

  beforeEach(() => {
    teamService = {
      createInvites: jest.fn().mockResolvedValue({ createdCount: 2 }),
    };

    controller = new TeamController(teamService as unknown as TeamService);
  });

  it('delegates invitation creation to the team service', async () => {
    const team = {
      id: 'team-1',
      name: 'Alpha Team',
      leaderId: 'leader-1',
    };

    const result = await controller.createInvites(
      { emails: ['a@example.com', 'b@example.com'] },
      { team: team as never },
    );

    expect(teamService.createInvites).toHaveBeenCalledWith(team, [
      'a@example.com',
      'b@example.com',
    ]);
    expect(result).toEqual({ createdCount: 2 });
  });
});

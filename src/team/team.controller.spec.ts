jest.mock('./team.service', () => ({
  TeamService: class TeamService {},
}));

jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

jest.mock('../auth/guards/roles.guard', () => ({
  RolesGuard: class RolesGuard {},
}));

import { TeamController } from './team.controller';
import { TeamService } from './team.service';

describe('TeamController', () => {
  let controller: TeamController;
  let teamService: {
    create: jest.Mock;
    findPublicById: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(() => {
    teamService = {
      create: jest.fn().mockResolvedValue({ id: 'team-1' }),
      findPublicById: jest.fn().mockResolvedValue({ id: 'team-1' }),
      update: jest.fn().mockResolvedValue({ id: 'team-1' }),
      remove: jest.fn().mockResolvedValue({ id: 'team-1' }),
    };

    controller = new TeamController(teamService as unknown as TeamService);
  });

  it('delegates create to the team service', async () => {
    const result = await controller.create(
      {
        name: 'Alpha Team',
        emails: ['a@example.com', 'b@example.com'],
      },
      { id: 'user-1', email: 'a@example.com' } as never,
    );

    expect(teamService.create).toHaveBeenCalledWith(
      { id: 'user-1', email: 'a@example.com' },
      { name: 'Alpha Team', emails: ['a@example.com', 'b@example.com'] },
    );
    expect(result).toEqual({ id: 'team-1' });
  });

  it('delegates public team lookup to the team service', async () => {
    const result = await controller.findById('team-1');

    expect(teamService.findPublicById).toHaveBeenCalledWith('team-1');
    expect(result).toEqual({ id: 'team-1' });
  });
});

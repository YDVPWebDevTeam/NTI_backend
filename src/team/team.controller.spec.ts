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
    removeMember: jest.Mock;
    leaveTeam: jest.Mock;
    transferLeadership: jest.Mock;
  };

  beforeEach(() => {
    teamService = {
      createInvites: jest.fn().mockResolvedValue({ createdCount: 2 }),
      removeMember: jest.fn().mockResolvedValue({
        teamId: 'team-1',
        memberId: 'member-1',
        removed: true,
      }),
      leaveTeam: jest.fn().mockResolvedValue({
        teamId: 'team-1',
        userId: 'member-1',
        left: true,
      }),
      transferLeadership: jest.fn().mockResolvedValue({
        id: 'team-1',
        leaderId: 'member-2',
        updatedAt: new Date('2026-04-20T10:00:00.000Z'),
      }),
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

  it('delegates member removal to the team service', async () => {
    const result = await controller.removeMember('team-1', 'member-1', {
      id: 'leader-1',
    } as never);

    expect(teamService.removeMember).toHaveBeenCalledWith(
      'team-1',
      'leader-1',
      'member-1',
    );
    expect(result).toEqual({
      teamId: 'team-1',
      memberId: 'member-1',
      removed: true,
    });
  });

  it('delegates leave-team to the team service', async () => {
    const result = await controller.leaveTeam('team-1', {
      id: 'member-1',
    } as never);

    expect(teamService.leaveTeam).toHaveBeenCalledWith('team-1', 'member-1');
    expect(result).toEqual({
      teamId: 'team-1',
      userId: 'member-1',
      left: true,
    });
  });

  it('delegates leadership transfer to the team service', async () => {
    const result = await controller.transferLeadership(
      'team-1',
      { newLeaderId: 'member-2' },
      { id: 'leader-1' } as never,
    );

    expect(teamService.transferLeadership).toHaveBeenCalledWith(
      'team-1',
      'leader-1',
      'member-2',
    );
    expect(result).toEqual({
      id: 'team-1',
      leaderId: 'member-2',
      updatedAt: new Date('2026-04-20T10:00:00.000Z'),
    });
  });
});

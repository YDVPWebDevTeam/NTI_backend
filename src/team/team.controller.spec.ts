jest.mock('./team.service', () => ({
  TeamService: class TeamService {},
}));

jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

jest.mock('../auth/guards/roles.guard', () => ({
  RolesGuard: class RolesGuard {},
}));

jest.mock('../auth/guards/team-lead.guard', () => ({
  TeamLeadGuard: class TeamLeadGuard {},
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
    removeMember: jest.Mock;
    leaveTeam: jest.Mock;
    transferLeadership: jest.Mock;
  };

  beforeEach(() => {
    teamService = {
      create: jest.fn().mockResolvedValue({ id: 'team-1' }),
      findPublicById: jest.fn().mockResolvedValue({ id: 'team-1' }),
      update: jest.fn().mockResolvedValue({ id: 'team-1' }),
      remove: jest.fn().mockResolvedValue({ id: 'team-1' }),
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

  it('delegates member removal to the team service', async () => {
    const result = await controller.removeMember(
      'team-1',
      'member-1',
      { id: 'leader-1' } as never,
    );

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
    const result = await controller.leaveTeam(
      'team-1',
      { id: 'member-1' } as never,
    );

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

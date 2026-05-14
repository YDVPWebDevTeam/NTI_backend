jest.mock('../team.service', () => ({
  TeamService: class TeamService {},
}));

jest.mock('./invitation.service', () => ({
  InvitationService: class InvitationService {},
}));

jest.mock('../../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

jest.mock('../../auth/guards/team-lead.guard', () => ({
  TeamLeadGuard: class TeamLeadGuard {},
}));

import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { TeamService } from '../team.service';

describe('InvitationController', () => {
  let controller: InvitationController;
  let teamService: {
    createInvites: jest.Mock;
  };
  let invitationService: {
    list: jest.Mock;
    revoke: jest.Mock;
    resend: jest.Mock;
    accept: jest.Mock;
  };

  beforeEach(() => {
    teamService = {
      createInvites: jest.fn().mockResolvedValue({
        createdCount: 1,
        invitations: [{ id: 'invite-1', email: 'student@example.com' }],
      }),
    };

    invitationService = {
      list: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
      revoke: jest.fn().mockResolvedValue({
        id: 'invite-1',
        email: 'student@example.com',
        revokedAt: new Date('2026-05-14T10:00:00.000Z'),
      }),
      resend: jest.fn().mockResolvedValue({
        id: 'invite-1',
        email: 'student@example.com',
        expiresAt: new Date('2026-05-15T10:00:00.000Z'),
      }),
      accept: jest.fn().mockResolvedValue({
        userId: 'user-1',
        teamId: 'team-1',
      }),
    };

    controller = new InvitationController(
      teamService as unknown as TeamService,
      invitationService as unknown as InvitationService,
    );
  });

  it('delegates invitation listing to the invitation service', async () => {
    const query = { page: 1, limit: 20, sort: 'createdAt', order: 'desc' };
    const result = await controller.listInvites(
      query as never,
      {
        team: { id: 'team-1' },
      } as never,
    );

    expect(invitationService.list).toHaveBeenCalledWith('team-1', query);
    expect(result.meta.total).toBe(0);
  });

  it('delegates invitation resend to the invitation service', async () => {
    const team = { id: 'team-1', name: 'Alpha Team', lockedAt: null };
    const result = await controller.resendInvitation('invite-1', {
      team,
    } as never);

    expect(invitationService.resend).toHaveBeenCalledWith(team, 'invite-1');
    expect(result).toMatchObject({
      id: 'invite-1',
      email: 'student@example.com',
      status: 'PENDING',
    });
  });
});

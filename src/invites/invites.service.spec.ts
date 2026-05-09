jest.mock('../team/invitations/invitation.service', () => ({
  InvitationService: class InvitationService {},
}));

import { InvitationService } from '../team/invitations/invitation.service';
import { InvitesService } from './invites.service';

describe('InvitesService', () => {
  let service: InvitesService;
  let invitationService: {
    validateTokenOrThrow: jest.Mock;
    accept: jest.Mock;
  };

  beforeEach(() => {
    invitationService = {
      validateTokenOrThrow: jest.fn(),
      accept: jest.fn(),
    };

    service = new InvitesService(
      invitationService as unknown as InvitationService,
    );
  });

  it('returns validation payload for a valid token', async () => {
    invitationService.validateTokenOrThrow.mockResolvedValue({
      id: 'invite-1',
      email: 'student@example.com',
      token: 'invite-token',
      status: 'PENDING',
      teamId: 'team-1',
      revokedAt: null,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      team: {
        id: 'team-1',
        name: 'Alpha Team',
      },
    });

    await expect(service.validateToken('invite-token')).resolves.toEqual({
      email: 'student@example.com',
      teamName: 'Alpha Team',
    });
  });

  it('delegates invitation acceptance to invitation service', async () => {
    invitationService.accept.mockResolvedValue({
      userId: 'user-1',
      teamId: 'team-1',
    });

    const result = await service.acceptForUser('token-1', {
      id: 'user-1',
      email: 'student@example.com',
    });

    expect(invitationService.accept).toHaveBeenCalledWith(
      'token-1',
      {
        id: 'user-1',
        email: 'student@example.com',
      },
      undefined,
    );
    expect(result).toEqual({ userId: 'user-1', teamId: 'team-1' });
  });
});

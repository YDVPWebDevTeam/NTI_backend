jest.mock('./invites.service', () => ({
  InvitesService: class InvitesService {},
}));

import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

describe('InvitesController', () => {
  let controller: InvitesController;
  let invitesService: {
    validateToken: jest.Mock;
  };

  beforeEach(() => {
    invitesService = {
      validateToken: jest.fn().mockResolvedValue({
        email: 'student@example.com',
        teamName: 'Alpha Team',
      }),
    };

    controller = new InvitesController(
      invitesService as unknown as InvitesService,
    );
  });

  it('delegates token validation to the invites service', async () => {
    const result = await controller.validateToken('invite-token');

    expect(invitesService.validateToken).toHaveBeenCalledWith('invite-token');
    expect(result).toEqual({
      email: 'student@example.com',
      teamName: 'Alpha Team',
    });
  });
});

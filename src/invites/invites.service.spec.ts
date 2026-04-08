jest.mock('./invites.repository', () => ({
  InvitesRepository: class InvitesRepository {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaDbClient } from '../infrastructure/database';
import { InvitesRepository } from './invites.repository';
import { InvitesService } from './invites.service';

describe('InvitesService', () => {
  let service: InvitesService;
  let invitesRepository: {
    findByTokenWithTeam: jest.Mock;
    markAccepted: jest.Mock;
    createTeamMember: jest.Mock;
  };

  beforeEach(() => {
    invitesRepository = {
      findByTokenWithTeam: jest.fn(),
      markAccepted: jest.fn(),
      createTeamMember: jest.fn(),
    };

    service = new InvitesService(
      invitesRepository as unknown as InvitesRepository,
    );
  });

  it('returns validation payload for a valid token', async () => {
    invitesRepository.findByTokenWithTeam.mockResolvedValue({
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

  it('throws not found when the token does not exist', async () => {
    invitesRepository.findByTokenWithTeam.mockResolvedValue(null);

    await expect(service.validateToken('missing-token')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws bad request when the token is expired', async () => {
    invitesRepository.findByTokenWithTeam.mockResolvedValue({
      id: 'invite-1',
      email: 'student@example.com',
      token: 'invite-token',
      status: 'PENDING',
      teamId: 'team-1',
      revokedAt: null,
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      team: {
        id: 'team-1',
        name: 'Alpha Team',
      },
    });

    await expect(service.validateToken('invite-token')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws bad request when the token is already accepted', async () => {
    invitesRepository.findByTokenWithTeam.mockResolvedValue({
      id: 'invite-1',
      email: 'student@example.com',
      token: 'invite-token',
      status: 'ACCEPTED',
      teamId: 'team-1',
      revokedAt: null,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      team: {
        id: 'team-1',
        name: 'Alpha Team',
      },
    });

    await expect(service.validateToken('invite-token')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('delegates invitation acceptance and membership creation to the repository', async () => {
    const transaction = {} as PrismaDbClient;

    await service.markAccepted('invite-1', transaction);
    await service.createTeamMember('user-1', 'team-1', transaction);

    expect(invitesRepository.markAccepted).toHaveBeenCalledWith(
      'invite-1',
      transaction,
    );
    expect(invitesRepository.createTeamMember).toHaveBeenCalledWith(
      'user-1',
      'team-1',
      transaction,
    );
  });
});

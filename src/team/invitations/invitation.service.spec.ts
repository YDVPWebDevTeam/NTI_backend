jest.mock('../../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('./invitation.repository', () => ({
  InvitationRepository: class InvitationRepository {},
}));

jest.mock('../team.repository', () => ({
  TeamRepository: class TeamRepository {},
}));

jest.mock('../../infrastructure/hashing', () => ({
  HashingService: class HashingService {},
}));

jest.mock('../../infrastructure/config', () => ({
  ConfigService: class ConfigService {},
}));

import type { PrismaDbClient } from '../../infrastructure/database';
import { ConfigService } from '../../infrastructure/config';
import { HashingService } from '../../infrastructure/hashing';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { TeamRepository } from '../team.repository';
import { InvitationRepository } from './invitation.repository';
import { InvitationService } from './invitation.service';

describe('InvitationService', () => {
  let service: InvitationService;
  let invitationRepository: {
    transaction: jest.Mock;
    create: jest.Mock;
    findActiveInvitationEmails: jest.Mock;
    findExistingMemberEmails: jest.Mock;
    findById: jest.Mock;
    findByToken: jest.Mock;
    revokeById: jest.Mock;
    markAccepted: jest.Mock;
    revokeInvitations: jest.Mock;
  };
  let teamRepository: {
    findById: jest.Mock;
    findMember: jest.Mock;
    addMember: jest.Mock;
  };
  let transactionClient: PrismaDbClient;
  let hashingService: {
    generateHexToken: jest.Mock;
  };

  beforeEach(() => {
    transactionClient = {} as PrismaDbClient;

    invitationRepository = {
      transaction: jest.fn(<T>(fn: (db: PrismaDbClient) => T | Promise<T>) =>
        fn(transactionClient),
      ),
      create: jest.fn().mockResolvedValue({
        id: 'invite-1',
        email: 'a@example.com',
        token: 'token-1',
      }),
      findActiveInvitationEmails: jest.fn().mockResolvedValue([]),
      findExistingMemberEmails: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        status: 'PENDING',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      findByToken: jest.fn().mockResolvedValue({
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        status: 'PENDING',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      revokeById: jest.fn().mockResolvedValue({
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        status: 'REVOKED',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      }),
      markAccepted: jest.fn().mockResolvedValue({
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        status: 'ACCEPTED',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      revokeInvitations: jest.fn().mockResolvedValue({ count: 1 }),
    };

    teamRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'team-1',
        lockedAt: null,
      }),
      findMember: jest.fn().mockResolvedValue(null),
      addMember: jest.fn().mockResolvedValue({
        userId: 'user-1',
        teamId: 'team-1',
      }),
    };

    hashingService = {
      generateHexToken: jest.fn().mockReturnValue('token-1'),
    };

    service = new InvitationService(
      invitationRepository as unknown as InvitationRepository,
      teamRepository as unknown as TeamRepository,
      hashingService as unknown as HashingService,
      {
        tokenByteLength: 32,
        emailVerificationExpirationHours: 24,
      } as unknown as ConfigService,
    );
  });

  it('creates invitations for a team', async () => {
    const result = await service.createInvites('team-1', [
      'A@example.com',
      'a@example.com',
      'b@example.com',
    ]);

    expect(invitationRepository.create).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('revokes an active invitation for a team', async () => {
    const result = await service.revoke('team-1', 'invite-1');

    expect(invitationRepository.findById).toHaveBeenCalledWith(
      'invite-1',
      undefined,
    );
    expect(invitationRepository.revokeById).toHaveBeenCalledWith(
      'invite-1',
      expect.any(Date),
      undefined,
    );
    expect(result.status).toBe('REVOKED');
  });

  it('accepts an invitation and adds the user to the team', async () => {
    const authUser = {
      id: 'user-1',
      email: 'a@example.com',
      role: 'STUDENT',
      status: 'ACTIVE',
    } as AuthenticatedUserContext;
    const result = await service.accept('token-1', authUser);

    expect(invitationRepository.findByToken).toHaveBeenCalledWith(
      'token-1',
      transactionClient,
    );
    expect(teamRepository.findById).toHaveBeenCalledWith(
      'team-1',
      transactionClient,
    );
    expect(teamRepository.addMember).toHaveBeenCalledWith(
      'team-1',
      'user-1',
      transactionClient,
    );
    expect(invitationRepository.markAccepted).toHaveBeenCalledWith(
      'invite-1',
      transactionClient,
    );
    expect(result).toEqual({ userId: 'user-1', teamId: 'team-1' });
  });

  it('rejects accepting an invitation for a different authenticated user', async () => {
    const authUser = {
      id: 'user-2',
      email: 'other@example.com',
      role: 'STUDENT',
      status: 'ACTIVE',
    } as AuthenticatedUserContext;

    await expect(service.accept('token-1', authUser)).rejects.toThrow(
      'Invitation token does not belong to the authenticated user',
    );

    expect(teamRepository.addMember).not.toHaveBeenCalled();
  });

  it('rejects accepting an invitation for a locked team', async () => {
    teamRepository.findById.mockResolvedValueOnce({
      id: 'team-1',
      lockedAt: new Date(),
    });
    const authUser = {
      id: 'user-1',
      email: 'a@example.com',
      role: 'STUDENT',
      status: 'ACTIVE',
    } as AuthenticatedUserContext;

    await expect(service.accept('token-1', authUser)).rejects.toThrow(
      'Team is locked',
    );

    expect(teamRepository.addMember).not.toHaveBeenCalled();
    expect(invitationRepository.markAccepted).not.toHaveBeenCalled();
  });
});

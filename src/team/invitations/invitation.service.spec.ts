jest.mock('../../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('./invitation.repository', () => ({
  InvitationRepository: class InvitationRepository {},
}));

jest.mock('../team.repository', () => ({
  TeamRepository: class TeamRepository {},
}));

jest.mock('../../user/user.service', () => ({
  UserService: class UserService {},
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
import { UserService } from '../../user/user.service';
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
    findMember: jest.Mock;
    addMember: jest.Mock;
  };
  let userService: {
    findByEmail: jest.Mock;
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
      findMember: jest.fn().mockResolvedValue(null),
      addMember: jest.fn().mockResolvedValue({
        userId: 'user-1',
        teamId: 'team-1',
      }),
    };

    userService = {
      findByEmail: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
      }),
    };

    hashingService = {
      generateHexToken: jest.fn().mockReturnValue('token-1'),
    };

    service = new InvitationService(
      invitationRepository as unknown as InvitationRepository,
      teamRepository as unknown as TeamRepository,
      userService as unknown as UserService,
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
    const result = await service.accept('token-1');

    expect(invitationRepository.findByToken).toHaveBeenCalledWith(
      'token-1',
      transactionClient,
    );
    expect(userService.findByEmail).toHaveBeenCalledWith(
      'a@example.com',
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
});

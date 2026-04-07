jest.mock('../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('./invitations/invitation.service', () => ({
  InvitationService: class InvitationService {},
}));

jest.mock('./team.repository', () => ({
  TeamRepository: class TeamRepository {},
}));

jest.mock('../infrastructure/queue', () => ({
  EMAIL_JOBS: {
    TEAM_INVITATION: 'team-invitation',
  },
  QueueService: class QueueService {},
}));

import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import type { PrismaDbClient } from '../infrastructure/database';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { InvitationService } from './invitations/invitation.service';
import { TeamRepository } from './team.repository';
import { TeamService } from './team.service';

type TeamRecord = {
  id: string;
  name: string;
  leaderId: string;
  lockedAt?: Date | null;
};

describe('TeamService', () => {
  let service: TeamService;
  let teamRepository: {
    transaction: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    findPublicById: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    addMember: jest.Mock;
    findMember: jest.Mock;
  };
  let invitationService: {
    createInvites: jest.Mock;
    revokeInvitations: jest.Mock;
  };
  let queueService: {
    addEmail: jest.Mock;
  };
  let transactionClient: PrismaDbClient;

  beforeEach(() => {
    transactionClient = {} as PrismaDbClient;

    teamRepository = {
      transaction: jest.fn(<T>(fn: (db: PrismaDbClient) => T | Promise<T>) =>
        fn(transactionClient),
      ),
      create: jest.fn().mockResolvedValue({
        id: 'team-1',
        name: 'Alpha Team',
        leaderId: 'user-1',
      }),
      findById: jest.fn().mockResolvedValue({
        id: 'team-1',
        name: 'Alpha Team',
        leaderId: 'user-1',
        members: [],
        leader: { id: 'user-1' },
      }),
      findPublicById: jest.fn().mockResolvedValue({
        id: 'team-1',
        name: 'Alpha Team',
        leaderId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        lockedAt: null,
        archivedAt: null,
      }),
      update: jest.fn().mockResolvedValue({
        id: 'team-1',
        name: 'Beta Team',
        leaderId: 'user-1',
        members: [],
        leader: { id: 'user-1' },
      }),
      remove: jest.fn().mockResolvedValue({
        id: 'team-1',
        name: 'Alpha Team',
        leaderId: 'user-1',
      }),
      addMember: jest.fn().mockResolvedValue({
        userId: 'user-1',
        teamId: 'team-1',
      }),
      findMember: jest.fn().mockResolvedValue(null),
    };

    invitationService = {
      createInvites: jest.fn().mockResolvedValue([
        { id: 'invite-1', email: 'a@example.com', token: 'token-1' },
        { id: 'invite-2', email: 'b@example.com', token: 'token-2' },
      ]),
      revokeInvitations: jest.fn().mockResolvedValue({ count: 2 }),
    };

    queueService = {
      addEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new TeamService(
      teamRepository as unknown as TeamRepository,
      invitationService as unknown as InvitationService,
      queueService as unknown as QueueService,
    );
  });

  it('creates a team and adds the leader as a member', async () => {
    const user = {
      id: 'user-1',
      email: 'a@example.com',
      role: 'STUDENT',
      status: 'ACTIVE',
    } as AuthenticatedUserContext;

    const result = await service.create(user, {
      name: 'Alpha Team',
      emails: ['a@example.com', 'b@example.com'],
    });

    expect(teamRepository.transaction).toHaveBeenCalled();
    expect(teamRepository.create).toHaveBeenCalledWith(
      { name: 'Alpha Team', leaderId: 'user-1' },
      transactionClient,
    );
    expect(teamRepository.addMember).toHaveBeenCalledWith(
      'team-1',
      'user-1',
      transactionClient,
    );
    expect(invitationService.createInvites).toHaveBeenCalledWith('team-1', [
      'a@example.com',
      'b@example.com',
    ]);
    expect(queueService.addEmail).toHaveBeenNthCalledWith(
      1,
      EMAIL_JOBS.TEAM_INVITATION,
      {
        email: 'a@example.com',
        teamName: 'Alpha Team',
        token: 'token-1',
      },
    );
    expect(result).toMatchObject({
      id: 'team-1',
      name: 'Alpha Team',
      leaderId: 'user-1',
    });
  });

  it('enqueues emails after invitation creation', async () => {
    const result = await service.createInvites(
      {
        id: 'team-1',
        name: 'Alpha Team',
      } as TeamRecord,
      ['a@example.com', 'b@example.com'],
    );

    expect(invitationService.createInvites).toHaveBeenCalledWith('team-1', [
      'a@example.com',
      'b@example.com',
    ]);
    expect(queueService.addEmail).toHaveBeenNthCalledWith(
      1,
      EMAIL_JOBS.TEAM_INVITATION,
      {
        email: 'a@example.com',
        teamName: 'Alpha Team',
        token: 'token-1',
      },
    );
    expect(result).toEqual({
      createdCount: 2,
      invitations: [
        { id: 'invite-1', email: 'a@example.com' },
        { id: 'invite-2', email: 'b@example.com' },
      ],
    });
  });

  it('rejects create when filtering leaves fewer than two invitations', async () => {
    invitationService.createInvites.mockResolvedValueOnce([
      { id: 'invite-1', email: 'b@example.com', token: 'token-1' },
    ]);

    const user = {
      id: 'user-1',
      email: 'a@example.com',
      role: 'STUDENT',
      status: 'ACTIVE',
    } as AuthenticatedUserContext;

    await expect(
      service.create(user, {
        name: 'Alpha Team',
        emails: ['a@example.com', 'b@example.com'],
      }),
    ).rejects.toThrow('At least 2 invitations must be created');

    expect(invitationService.revokeInvitations).toHaveBeenCalledWith([
      'invite-1',
    ]);
    expect(queueService.addEmail).not.toHaveBeenCalled();
    expect(teamRepository.remove).toHaveBeenCalledWith({ id: 'team-1' });
  });

  it('returns public team data without access check', async () => {
    const result = await service.findPublicById('team-1');

    expect(teamRepository.findPublicById).toHaveBeenCalledWith('team-1');
    expect(result.id).toBe('team-1');
  });
});

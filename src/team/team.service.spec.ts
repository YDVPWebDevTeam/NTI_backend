jest.mock('../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('./team.repository', () => ({
  TeamRepository: class TeamRepository {},
}));

jest.mock('../infrastructure/hashing', () => ({
  HashingService: class HashingService {},
}));

jest.mock('../infrastructure/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('../infrastructure/queue', () => ({
  EMAIL_JOBS: {
    TEAM_INVITATION: 'team-invitation',
  },
  QueueService: class QueueService {},
}));

import type { PrismaDbClient } from '../infrastructure/database';
import { ConfigService } from '../infrastructure/config';
import { HashingService } from '../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { TeamRepository } from './team.repository';
import { TeamService } from './team.service';

type CreatedInvitation = {
  id: string;
  email: string;
  token: string;
};

type TransactionCallback = (db: PrismaDbClient) => Promise<CreatedInvitation[]>;

describe('TeamService', () => {
  let service: TeamService;
  let teamRepository: {
    transaction: jest.Mock<Promise<CreatedInvitation[]>, [TransactionCallback]>;
    createInvitation: jest.Mock<
      Promise<CreatedInvitation>,
      [
        {
          email: string;
          token: string;
          teamId: string;
          status: 'PENDING';
          expiresAt: Date;
        },
        PrismaDbClient,
      ]
    >;
    findActiveInvitationEmails: jest.Mock<
      Promise<Array<{ email: string }>>,
      [string, string[], Date, PrismaDbClient]
    >;
    findExistingMemberEmails: jest.Mock<
      Promise<Array<{ user: { email: string } }>>,
      [string, string[], PrismaDbClient]
    >;
    revokeInvitations: jest.Mock<Promise<{ count: number }>, [string[]]>;
  };
  let transactionClient: PrismaDbClient;
  let hashingService: {
    generateHexToken: jest.Mock<string, [number]>;
  };
  let queueService: {
    addEmail: jest.Mock<
      Promise<void>,
      [string, { email: string; teamName: string; token: string }]
    >;
  };

  beforeEach(() => {
    transactionClient = {} as PrismaDbClient;

    teamRepository = {
      transaction: jest.fn<
        Promise<CreatedInvitation[]>,
        [TransactionCallback]
      >(),
      createInvitation: jest
        .fn<
          Promise<CreatedInvitation>,
          [
            {
              email: string;
              token: string;
              teamId: string;
              status: 'PENDING';
              expiresAt: Date;
            },
            PrismaDbClient,
          ]
        >()
        .mockResolvedValueOnce({
          id: 'invite-1',
          email: 'a@example.com',
          token: 'token-1',
        })
        .mockResolvedValueOnce({
          id: 'invite-2',
          email: 'b@example.com',
          token: 'token-2',
        }),
      findActiveInvitationEmails: jest
        .fn<
          Promise<Array<{ email: string }>>,
          [string, string[], Date, PrismaDbClient]
        >()
        .mockResolvedValue([]),
      findExistingMemberEmails: jest
        .fn<
          Promise<Array<{ user: { email: string } }>>,
          [string, string[], PrismaDbClient]
        >()
        .mockResolvedValue([]),
      revokeInvitations: jest
        .fn<Promise<{ count: number }>, [string[]]>()
        .mockResolvedValue({ count: 0 }),
    };

    teamRepository.transaction.mockImplementation((fn) =>
      fn(transactionClient),
    );

    hashingService = {
      generateHexToken: jest
        .fn<string, [number]>()
        .mockReturnValueOnce('token-1')
        .mockReturnValueOnce('token-2'),
    };

    queueService = {
      addEmail: jest
        .fn<
          Promise<void>,
          [string, { email: string; teamName: string; token: string }]
        >()
        .mockResolvedValue(undefined),
    };

    service = new TeamService(
      teamRepository as unknown as TeamRepository,
      hashingService as unknown as HashingService,
      {
        tokenByteLength: 32,
        emailVerificationExpirationHours: 24,
      } as unknown as ConfigService,
      queueService as unknown as QueueService,
    );
  });

  it('creates an invitation and enqueues an email for each provided address', async () => {
    const result = await service.createInvites(
      {
        id: 'team-1',
        name: 'Alpha Team',
      } as never,
      [' A@example.com ', 'B@example.com'],
    );

    expect(teamRepository.transaction).toHaveBeenCalled();
    expect(teamRepository.findActiveInvitationEmails).toHaveBeenCalledWith(
      'team-1',
      ['a@example.com', 'b@example.com'],
      expect.any(Date),
      transactionClient,
    );
    expect(teamRepository.findExistingMemberEmails).toHaveBeenCalledWith(
      'team-1',
      ['a@example.com', 'b@example.com'],
      transactionClient,
    );
    expect(teamRepository.createInvitation).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        email: 'a@example.com',
        token: 'token-1',
        teamId: 'team-1',
        status: 'PENDING',
      }),
      transactionClient,
    );
    expect(teamRepository.createInvitation).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        email: 'b@example.com',
        token: 'token-2',
        teamId: 'team-1',
        status: 'PENDING',
      }),
      transactionClient,
    );
    expect(queueService.addEmail).toHaveBeenNthCalledWith(
      1,
      EMAIL_JOBS.TEAM_INVITATION,
      {
        email: 'a@example.com',
        teamName: 'Alpha Team',
        token: 'token-1',
      },
    );
    expect(queueService.addEmail).toHaveBeenNthCalledWith(
      2,
      EMAIL_JOBS.TEAM_INVITATION,
      {
        email: 'b@example.com',
        teamName: 'Alpha Team',
        token: 'token-2',
      },
    );
    expect(result).toEqual({ createdCount: 2 });
  });

  it('deduplicates normalized emails before creating invitations', async () => {
    await service.createInvites(
      {
        id: 'team-1',
        name: 'Alpha Team',
      } as never,
      ['A@example.com', ' a@example.com '],
    );

    expect(teamRepository.createInvitation).toHaveBeenCalledTimes(1);
    expect(queueService.addEmail).toHaveBeenCalledTimes(1);
  });

  it('skips emails with active invitations or existing team membership', async () => {
    teamRepository.findActiveInvitationEmails.mockResolvedValue([
      { email: 'a@example.com' },
    ]);
    teamRepository.findExistingMemberEmails.mockResolvedValue([
      { user: { email: 'b@example.com' } },
    ]);

    const result = await service.createInvites(
      {
        id: 'team-1',
        name: 'Alpha Team',
      } as never,
      ['A@example.com', 'b@example.com', 'c@example.com'],
    );

    expect(teamRepository.createInvitation).toHaveBeenCalledTimes(1);
    expect(teamRepository.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'c@example.com',
      }),
      transactionClient,
    );
    expect(queueService.addEmail).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ createdCount: 1 });
  });

  it('revokes created invitations when queue enqueue fails', async () => {
    queueService.addEmail.mockRejectedValueOnce(new Error('queue down'));

    await expect(
      service.createInvites(
        {
          id: 'team-1',
          name: 'Alpha Team',
        } as never,
        ['A@example.com', 'b@example.com'],
      ),
    ).rejects.toThrow('Failed to enqueue invitation emails');

    expect(teamRepository.revokeInvitations).toHaveBeenCalledWith([
      'invite-1',
      'invite-2',
    ]);
  });
});

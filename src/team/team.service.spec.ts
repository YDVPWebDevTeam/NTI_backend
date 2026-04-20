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
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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

type TeamRecord = {
  id: string;
  name?: string;
  leaderId: string;
  updatedAt?: Date;
  lockedAt?: Date | null;
};

describe('TeamService', () => {
  let service: TeamService;
  let teamRepository: {
    transaction: jest.Mock;
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
    findUnique: jest.Mock<
      Promise<TeamRecord | null>,
      [{ id: string }, PrismaDbClient?]
    >;
    findMembership: jest.Mock<
      Promise<{ teamId: string; userId: string } | null>,
      [string, string, PrismaDbClient?]
    >;
    deleteMembership: jest.Mock<
      Promise<{ teamId: string; userId: string }>,
      [string, string, PrismaDbClient?]
    >;
    updateLeader: jest.Mock<
      Promise<TeamRecord>,
      [string, string, PrismaDbClient?]
    >;
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
      transaction: jest
        .fn<Promise<unknown>, [(db: PrismaDbClient) => Promise<unknown>]>()
        .mockImplementation((fn) => fn(transactionClient)),
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
      findUnique: jest
        .fn<Promise<TeamRecord | null>, [{ id: string }, PrismaDbClient?]>()
        .mockResolvedValue({
          id: 'team-1',
          name: 'Alpha Team',
          leaderId: 'leader-1',
          updatedAt: new Date('2026-04-20T10:00:00.000Z'),
          lockedAt: null,
        }),
      findMembership: jest
        .fn<
          Promise<{ teamId: string; userId: string } | null>,
          [string, string, PrismaDbClient?]
        >()
        .mockResolvedValue({
          teamId: 'team-1',
          userId: 'member-1',
        }),
      deleteMembership: jest
        .fn<
          Promise<{ teamId: string; userId: string }>,
          [string, string, PrismaDbClient?]
        >()
        .mockResolvedValue({
          teamId: 'team-1',
          userId: 'member-1',
        }),
      updateLeader: jest
        .fn<Promise<TeamRecord>, [string, string, PrismaDbClient?]>()
        .mockResolvedValue({
          id: 'team-1',
          leaderId: 'member-2',
          updatedAt: new Date('2026-04-20T10:00:00.000Z'),
          lockedAt: null,
        }),
    };

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

  it('removes a non-leader member when requested by the team leader', async () => {
    const result = await service.removeMember('team-1', 'leader-1', 'member-1');

    expect(teamRepository.findUnique).toHaveBeenCalledWith(
      { id: 'team-1' },
      undefined,
    );
    expect(teamRepository.findMembership).toHaveBeenCalledWith(
      'team-1',
      'member-1',
    );
    expect(teamRepository.deleteMembership).toHaveBeenCalledWith(
      'team-1',
      'member-1',
    );
    expect(result).toEqual({
      teamId: 'team-1',
      memberId: 'member-1',
      removed: true,
    });
  });

  it('rejects member removal when the actor is not the team leader', async () => {
    await expect(
      service.removeMember('team-1', 'member-2', 'member-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(teamRepository.deleteMembership).not.toHaveBeenCalled();
  });

  it('rejects member removal for a locked team', async () => {
    teamRepository.findUnique.mockResolvedValueOnce({
      id: 'team-1',
      leaderId: 'leader-1',
      lockedAt: new Date('2026-04-20T10:00:00.000Z'),
    });

    await expect(
      service.removeMember('team-1', 'leader-1', 'member-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(teamRepository.deleteMembership).not.toHaveBeenCalled();
  });

  it('rejects member removal when attempting to remove the current leader', async () => {
    await expect(
      service.removeMember('team-1', 'leader-1', 'leader-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(teamRepository.findMembership).not.toHaveBeenCalled();
  });

  it('rejects member removal when membership does not exist', async () => {
    teamRepository.findMembership.mockResolvedValueOnce(null);

    await expect(
      service.removeMember('team-1', 'leader-1', 'missing-member'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows a non-leader member to leave a team', async () => {
    teamRepository.findMembership.mockResolvedValueOnce({
      teamId: 'team-1',
      userId: 'member-1',
    });

    const result = await service.leaveTeam('team-1', 'member-1');

    expect(teamRepository.deleteMembership).toHaveBeenCalledWith(
      'team-1',
      'member-1',
    );
    expect(result).toEqual({
      teamId: 'team-1',
      userId: 'member-1',
      left: true,
    });
  });

  it('rejects leave-team when membership does not exist', async () => {
    teamRepository.findMembership.mockResolvedValueOnce(null);

    await expect(
      service.leaveTeam('team-1', 'member-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects leave-team for the current leader', async () => {
    teamRepository.findMembership.mockResolvedValueOnce({
      teamId: 'team-1',
      userId: 'leader-1',
    });

    await expect(
      service.leaveTeam('team-1', 'leader-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(teamRepository.deleteMembership).not.toHaveBeenCalled();
  });

  it('rejects leave-team for a locked team', async () => {
    teamRepository.findUnique.mockResolvedValueOnce({
      id: 'team-1',
      leaderId: 'leader-1',
      lockedAt: new Date('2026-04-20T10:00:00.000Z'),
    });

    await expect(
      service.leaveTeam('team-1', 'member-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects leave-team when the team does not exist', async () => {
    teamRepository.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.leaveTeam('missing-team', 'member-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('transfers leadership to an existing member inside a transaction', async () => {
    const result = await service.transferLeadership(
      'team-1',
      'leader-1',
      'member-2',
    );

    expect(teamRepository.findUnique).toHaveBeenCalledWith(
      { id: 'team-1' },
      transactionClient,
    );
    expect(teamRepository.findMembership).toHaveBeenCalledWith(
      'team-1',
      'member-2',
      transactionClient,
    );
    expect(teamRepository.updateLeader).toHaveBeenCalledWith(
      'team-1',
      'member-2',
      transactionClient,
    );
    expect(result).toEqual({
      id: 'team-1',
      leaderId: 'member-2',
      updatedAt: new Date('2026-04-20T10:00:00.000Z'),
    });
  });

  it('rejects leadership transfer when the actor is not the team leader', async () => {
    await expect(
      service.transferLeadership('team-1', 'member-1', 'member-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(teamRepository.updateLeader).not.toHaveBeenCalled();
  });

  it('rejects leadership transfer when the new leader is not a team member', async () => {
    teamRepository.findMembership.mockResolvedValueOnce(null);

    await expect(
      service.transferLeadership('team-1', 'leader-1', 'missing-member'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(teamRepository.updateLeader).not.toHaveBeenCalled();
  });

  it('rejects leadership transfer for a locked team', async () => {
    teamRepository.findUnique.mockResolvedValueOnce({
      id: 'team-1',
      leaderId: 'leader-1',
      lockedAt: new Date('2026-04-20T10:00:00.000Z'),
    });

    await expect(
      service.transferLeadership('team-1', 'leader-1', 'member-2'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects lifecycle actions when the team does not exist', async () => {
    teamRepository.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.removeMember('missing-team', 'leader-1', 'member-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

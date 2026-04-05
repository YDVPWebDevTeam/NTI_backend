/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
jest.mock('../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('../infrastructure/database/prisma.service', () => ({
  PrismaService: class PrismaService {},
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

import { ConfigService } from '../infrastructure/config';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { HashingService } from '../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { TeamService } from './team.service';

type InvitationCreateArgs = {
  data: {
    email: string;
    token: string;
    teamId: string;
    status: string;
    expiresAt: Date;
  };
};

type CreatedInvitation = {
  id: string;
  email: string;
  token: string;
};

describe('TeamService', () => {
  let service: TeamService;
  let prismaService: {
    client: {
      $transaction: jest.Mock<
        Promise<CreatedInvitation[]>,
        [
          (db: {
            invitation: {
              create: (
                args: InvitationCreateArgs,
              ) => Promise<CreatedInvitation>;
            };
          }) => Promise<CreatedInvitation[]>,
        ]
      >;
    };
  };
  let invitationCreate: jest.Mock<
    Promise<CreatedInvitation>,
    [InvitationCreateArgs]
  >;
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
    invitationCreate = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'invite-1',
        email: 'a@example.com',
        token: 'token-1',
      })
      .mockResolvedValueOnce({
        id: 'invite-2',
        email: 'b@example.com',
        token: 'token-2',
      });

    prismaService = {
      client: {
        $transaction: jest.fn().mockImplementation((fn) =>
          fn({
            invitation: {
              create: invitationCreate,
            },
          }),
        ),
      },
    };

    hashingService = {
      generateHexToken: jest
        .fn()
        .mockReturnValueOnce('token-1')
        .mockReturnValueOnce('token-2'),
    };

    queueService = {
      addEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new TeamService(
      prismaService as unknown as PrismaService,
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

    expect(prismaService.client.$transaction).toHaveBeenCalled();
    expect(invitationCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'a@example.com',
          token: 'token-1',
          teamId: 'team-1',
          status: 'PENDING',
        }),
      }),
    );
    expect(invitationCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'b@example.com',
          token: 'token-2',
          teamId: 'team-1',
          status: 'PENDING',
        }),
      }),
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
});

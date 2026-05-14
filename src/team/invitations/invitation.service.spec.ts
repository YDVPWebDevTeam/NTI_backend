/// <reference types="jest" />

jest.mock('../../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('./invitation.repository', () => ({
  InvitationRepository: class InvitationRepository {},
}));

jest.mock('../team.repository', () => ({
  TeamRepository: class TeamRepository {},
}));

jest.mock('../../common/invitations/invitation-token.service', () => ({
  InvitationTokenService: class InvitationTokenService {},
}));

jest.mock('../../applications/eligibility-signals.service', () => ({
  EligibilitySignalsService: class EligibilitySignalsService {},
}));

jest.mock('../../infrastructure/queue', () => ({
  EMAIL_JOBS: {
    TEAM_INVITATION: 'team-invitation',
  },
  QueueService: class QueueService {},
}));

import { EligibilitySignalsService } from '../../applications/eligibility-signals.service';
import { InvitationTokenService } from '../../common/invitations/invitation-token.service';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import type { PrismaDbClient } from '../../infrastructure/database';
import { QueueService } from '../../infrastructure/queue';
import { TeamRepository } from '../team.repository';
import { InvitationRepository } from './invitation.repository';
import { InvitationService } from './invitation.service';

describe('InvitationService', () => {
  let service: InvitationService;
  let invitationRepository: {
    transaction: jest.Mock;
    createMany: jest.Mock;
    findByTokens: jest.Mock;
    findActiveInvitationEmails: jest.Mock;
    findExistingMemberEmails: jest.Mock;
    findById: jest.Mock;
    findByIdAndTeam: jest.Mock;
    findByToken: jest.Mock;
    findByTokenWithTeam: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    revokePendingById: jest.Mock;
    markAcceptedIfPending: jest.Mock;
    revokeInvitations: jest.Mock;
  };
  let teamRepository: {
    findById: jest.Mock;
    findMember: jest.Mock;
    addMember: jest.Mock;
  };
  let transactionClient: PrismaDbClient;
  let invitationTokenService: {
    generateToken: jest.Mock;
    resolveTeamInvitationExpirationDate: jest.Mock;
  };
  let eligibilitySignalsService: {
    recomputeForTeamApplications: jest.Mock;
  };
  let queueService: {
    addEmail: jest.Mock;
  };
  let tokenCounter: number;

  beforeEach(() => {
    transactionClient = {} as PrismaDbClient;
    tokenCounter = 0;

    invitationRepository = {
      transaction: jest.fn(<T>(fn: (db: PrismaDbClient) => T | Promise<T>) =>
        fn(transactionClient),
      ),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      findByTokens: jest.fn((tokens: string[]) =>
        Promise.resolve(
          tokens.map((token, index) => ({
            id: `invite-${index + 1}`,
            email: index === 0 ? 'a@example.com' : 'b@example.com',
            token,
            teamId: 'team-1',
            status: 'PENDING',
            createdAt: new Date('2026-05-10T10:00:00.000Z'),
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
          })),
        ),
      ),
      findActiveInvitationEmails: jest.fn().mockResolvedValue([]),
      findExistingMemberEmails: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        status: 'PENDING',
        createdAt: new Date('2026-05-10T10:00:00.000Z'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      findByIdAndTeam: jest.fn().mockResolvedValue({
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        token: 'token-0',
        status: 'PENDING',
        createdAt: new Date('2026-05-10T10:00:00.000Z'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      findByToken: jest.fn().mockResolvedValue({
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        status: 'PENDING',
        createdAt: new Date('2026-05-10T10:00:00.000Z'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      findByTokenWithTeam: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        token: 'token-1',
        status: 'PENDING',
        createdAt: new Date('2026-05-10T10:00:00.000Z'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
      revokePendingById: jest.fn().mockResolvedValue({ count: 1 }),
      markAcceptedIfPending: jest.fn().mockResolvedValue({ count: 1 }),
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

    invitationTokenService = {
      generateToken: jest.fn(() => {
        tokenCounter += 1;
        return `token-${tokenCounter}`;
      }),
      resolveTeamInvitationExpirationDate: jest
        .fn()
        .mockReturnValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    };

    eligibilitySignalsService = {
      recomputeForTeamApplications: jest.fn().mockResolvedValue(undefined),
    };

    queueService = {
      addEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new InvitationService(
      invitationRepository as unknown as InvitationRepository,
      teamRepository as unknown as TeamRepository,
      invitationTokenService as unknown as InvitationTokenService,
      eligibilitySignalsService as unknown as EligibilitySignalsService,
      queueService as unknown as QueueService,
    );
  });

  it('creates invitations for a team', async () => {
    const result = await service.createInvites('team-1', [
      'A@example.com',
      'a@example.com',
      'b@example.com',
    ]);

    expect(invitationRepository.createMany).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
  });

  it('retries invitation batch creation when token unique collision happens', async () => {
    invitationRepository.createMany
      .mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: 'token' },
      })
      .mockResolvedValueOnce({ count: 2 });

    const result = await service.createInvites('team-1', [
      'a@example.com',
      'b@example.com',
    ]);

    expect(invitationRepository.createMany).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('does not retry token collisions inside a caller transaction', async () => {
    const uniqueError = {
      code: 'P2002',
      meta: { target: 'token' },
    };

    invitationRepository.createMany.mockRejectedValue(uniqueError);

    await expect(
      service.createInvites('team-1', ['a@example.com'], transactionClient),
    ).rejects.toBe(uniqueError);

    expect(invitationRepository.createMany).toHaveBeenCalledTimes(1);
    expect(invitationRepository.transaction).not.toHaveBeenCalled();
  });

  it('throws after max retries when token unique collision keeps happening', async () => {
    invitationRepository.createMany.mockRejectedValue({
      code: 'P2002',
      meta: { target: 'token' },
    });

    await expect(
      service.createInvites('team-1', ['a@example.com', 'b@example.com']),
    ).rejects.toMatchObject({ code: 'P2002' });

    expect(invitationRepository.createMany).toHaveBeenCalledTimes(5);
  });

  it('revokes an active invitation for a team', async () => {
    invitationRepository.findById
      .mockResolvedValueOnce({
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        status: 'PENDING',
        createdAt: new Date('2026-05-10T10:00:00.000Z'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      })
      .mockResolvedValueOnce({
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        status: 'REVOKED',
        createdAt: new Date('2026-05-10T10:00:00.000Z'),
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

    const result = await service.revoke('team-1', 'invite-1');

    expect(invitationRepository.findById).toHaveBeenCalledWith(
      'invite-1',
      undefined,
    );
    expect(invitationRepository.revokePendingById).toHaveBeenCalledWith(
      'invite-1',
      expect.any(Date),
      undefined,
    );
    expect(result.status).toBe('REVOKED');
  });

  it('lists invitations with pagination metadata', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    invitationRepository.findMany.mockResolvedValue([
      {
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        token: 'token-1',
        status: 'PENDING',
        createdAt: new Date('2026-05-10T10:00:00.000Z'),
        revokedAt: null,
        expiresAt,
      },
    ]);
    invitationRepository.count.mockResolvedValue(1);

    const result = await service.list('team-1', {
      page: 1,
      limit: 20,
      sort: 'createdAt',
      order: 'desc',
    });

    expect(invitationRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: 'team-1' },
        skip: 0,
        take: 20,
      }),
      undefined,
    );
    expect(result).toEqual({
      data: [
        {
          id: 'invite-1',
          email: 'a@example.com',
          status: 'PENDING',
          createdAt: new Date('2026-05-10T10:00:00.000Z'),
          expiresAt,
          revokedAt: null,
        },
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('resends an active invitation and queues a new email', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    invitationRepository.update.mockResolvedValue({
      id: 'invite-1',
      email: 'a@example.com',
      teamId: 'team-1',
      token: 'token-1',
      status: 'PENDING',
      createdAt: new Date('2026-05-10T10:00:00.000Z'),
      revokedAt: null,
      expiresAt,
    });

    const result = await service.resend(
      {
        id: 'team-1',
        name: 'Alpha Team',
        lockedAt: null,
      },
      'invite-1',
    );

    expect(invitationRepository.findByIdAndTeam).toHaveBeenCalledWith(
      'invite-1',
      'team-1',
      undefined,
    );
    expect(invitationRepository.update).toHaveBeenCalledWith(
      { id: 'invite-1' },
      expect.objectContaining({
        token: 'token-1',
        status: 'PENDING',
      }),
      undefined,
    );
    expect(queueService.addEmail).toHaveBeenCalledWith(
      'team-invitation',
      {
        email: 'a@example.com',
        teamName: 'Alpha Team',
        token: 'token-1',
      },
      {
        jobId: 'team-invitation:invite-1:token-1',
      },
    );
    expect(result.expiresAt).toEqual(expiresAt);
  });

  it('retries resend when token unique collision happens', async () => {
    invitationRepository.update
      .mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: 'token' },
      })
      .mockResolvedValueOnce({
        id: 'invite-1',
        email: 'a@example.com',
        teamId: 'team-1',
        token: 'token-2',
        status: 'PENDING',
        createdAt: new Date('2026-05-10T10:00:00.000Z'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

    const result = await service.resend(
      {
        id: 'team-1',
        name: 'Alpha Team',
        lockedAt: null,
      },
      'invite-1',
    );

    expect(invitationRepository.update).toHaveBeenCalledTimes(2);
    expect(invitationRepository.update).toHaveBeenNthCalledWith(
      1,
      { id: 'invite-1' },
      expect.objectContaining({
        token: 'token-1',
        status: 'PENDING',
      }),
      undefined,
    );
    expect(invitationRepository.update).toHaveBeenNthCalledWith(
      2,
      { id: 'invite-1' },
      expect.objectContaining({
        token: 'token-2',
        status: 'PENDING',
      }),
      undefined,
    );
    expect(queueService.addEmail).toHaveBeenCalledWith(
      'team-invitation',
      {
        email: 'a@example.com',
        teamName: 'Alpha Team',
        token: 'token-2',
      },
      { jobId: 'team-invitation:invite-1:token-2' },
    );
    expect(result.token).toBe('token-2');
  });

  it('does not retry resend token collisions inside a caller transaction', async () => {
    const uniqueError = {
      code: 'P2002',
      meta: { target: 'token' },
    };

    invitationRepository.update.mockRejectedValueOnce(uniqueError);

    await expect(
      service.resend(
        {
          id: 'team-1',
          name: 'Alpha Team',
          lockedAt: null,
        },
        'invite-1',
        transactionClient,
      ),
    ).rejects.toMatchObject({ code: 'P2002' });

    expect(invitationRepository.update).toHaveBeenCalledTimes(1);
    expect(queueService.addEmail).not.toHaveBeenCalled();
  });

  it('restores the previous token when resend email enqueue fails', async () => {
    queueService.addEmail.mockRejectedValueOnce(new Error('queue unavailable'));

    await expect(
      service.resend(
        {
          id: 'team-1',
          name: 'Alpha Team',
          lockedAt: null,
        },
        'invite-1',
      ),
    ).rejects.toThrow('queue unavailable');

    expect(invitationRepository.update).toHaveBeenNthCalledWith(
      2,
      { id: 'invite-1' },
      expect.objectContaining({
        token: 'token-0',
      }),
      undefined,
    );
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
    expect(invitationRepository.markAcceptedIfPending).toHaveBeenCalledWith(
      'invite-1',
      'a@example.com',
      expect.any(Date),
      transactionClient,
    );
    expect(
      eligibilitySignalsService.recomputeForTeamApplications,
    ).toHaveBeenCalledWith('team-1', transactionClient);
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
    expect(
      eligibilitySignalsService.recomputeForTeamApplications,
    ).not.toHaveBeenCalled();
  });

  it('accepts invitation when authenticated email differs only by case', async () => {
    const authUser = {
      id: 'user-1',
      email: 'A@Example.com',
      role: 'STUDENT',
      status: 'ACTIVE',
    } as AuthenticatedUserContext;

    const result = await service.accept('token-1', authUser);

    expect(invitationRepository.markAcceptedIfPending).toHaveBeenCalledWith(
      'invite-1',
      'a@example.com',
      expect.any(Date),
      transactionClient,
    );
    expect(
      eligibilitySignalsService.recomputeForTeamApplications,
    ).toHaveBeenCalledWith('team-1', transactionClient);
    expect(result).toEqual({ userId: 'user-1', teamId: 'team-1' });
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
    expect(invitationRepository.markAcceptedIfPending).not.toHaveBeenCalled();
    expect(
      eligibilitySignalsService.recomputeForTeamApplications,
    ).not.toHaveBeenCalled();
  });

  it('maps team member unique violations to conflict on accept', async () => {
    teamRepository.addMember.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['userId', 'teamId'] },
    });

    const authUser = {
      id: 'user-1',
      email: 'a@example.com',
      role: 'STUDENT',
      status: 'ACTIVE',
    } as AuthenticatedUserContext;

    await expect(service.accept('token-1', authUser)).rejects.toThrow(
      'User is already a team member',
    );

    expect(invitationRepository.markAcceptedIfPending).toHaveBeenCalledTimes(1);
    expect(
      eligibilitySignalsService.recomputeForTeamApplications,
    ).not.toHaveBeenCalled();
  });
});

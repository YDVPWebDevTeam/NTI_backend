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

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
  updatedAt?: Date;
  lockedAt: Date | null;
};

describe('TeamService', () => {
  let service: TeamService;
  let teamRepository: {
    transaction: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    findPublicById: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    addMember: jest.Mock;
    findMember: jest.Mock;
    deleteMembership: jest.Mock;
    updateLeader: jest.Mock;
  };
  let invitationService: {
    createInvites: jest.Mock;
    revokeInvitations: jest.Mock;
  };
  let queueService: {
    addEmail: jest.Mock;
    removeEmailJob: jest.Mock;
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
        updatedAt: new Date('2026-04-20T10:00:00.000Z'),
        lockedAt: null,
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
      findUnique: jest.fn().mockResolvedValue({
        id: 'team-1',
        name: 'Alpha Team',
        leaderId: 'leader-1',
        updatedAt: new Date('2026-04-20T10:00:00.000Z'),
        lockedAt: null,
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
      findMember: jest.fn().mockResolvedValue({
        teamId: 'team-1',
        userId: 'member-1',
      }),
      deleteMembership: jest.fn().mockResolvedValue({ count: 1 }),
      updateLeader: jest.fn().mockResolvedValue({
        id: 'team-1',
        leaderId: 'member-2',
        updatedAt: new Date('2026-04-20T10:00:00.000Z'),
        lockedAt: null,
      }),
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
      removeEmailJob: jest.fn().mockResolvedValue(undefined),
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
      { jobId: 'team-invitation:invite-1' },
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
        lockedAt: null,
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
      { jobId: 'team-invitation:invite-1' },
    );
    expect(result).toEqual({
      createdCount: 2,
      invitations: [
        { id: 'invite-1', email: 'a@example.com' },
        { id: 'invite-2', email: 'b@example.com' },
      ],
    });
  });

  it('rejects creating invites for a locked team', async () => {
    await expect(
      service.createInvites(
        {
          id: 'team-1',
          name: 'Alpha Team',
          lockedAt: new Date(),
        } as TeamRecord,
        ['a@example.com'],
      ),
    ).rejects.toThrow('Team is locked');

    expect(invitationService.createInvites).not.toHaveBeenCalled();
    expect(queueService.addEmail).not.toHaveBeenCalled();
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

  it('removes already queued jobs and revokes invitations when enqueue fails', async () => {
    queueService.addEmail
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('queue unavailable'));

    await expect(
      service.createInvites(
        {
          id: 'team-1',
          name: 'Alpha Team',
          lockedAt: null,
        } as TeamRecord,
        ['a@example.com', 'b@example.com'],
      ),
    ).rejects.toThrow('Failed to enqueue invitation emails');

    expect(queueService.removeEmailJob).toHaveBeenCalledTimes(1);
    expect(queueService.removeEmailJob).toHaveBeenCalledWith(
      'team-invitation:invite-1',
    );
    expect(invitationService.revokeInvitations).toHaveBeenCalledWith([
      'invite-1',
      'invite-2',
    ]);
  });

  it('removes a non-leader member when requested by the team leader', async () => {
    const result = await service.removeMember('team-1', 'leader-1', 'member-1');

    expect(teamRepository.findUnique).toHaveBeenCalledWith(
      { id: 'team-1' },
      transactionClient,
    );
    expect(teamRepository.findMember).toHaveBeenCalledWith(
      'team-1',
      'member-1',
      transactionClient,
    );
    expect(teamRepository.deleteMembership).toHaveBeenCalledWith(
      'team-1',
      'member-1',
      transactionClient,
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
      name: 'Alpha Team',
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

    expect(teamRepository.findMember).not.toHaveBeenCalled();
  });

  it('rejects member removal when membership does not exist', async () => {
    teamRepository.findMember.mockResolvedValueOnce(null);

    await expect(
      service.removeMember('team-1', 'leader-1', 'missing-member'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects member removal when membership disappears before delete', async () => {
    teamRepository.deleteMembership.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.removeMember('team-1', 'leader-1', 'member-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows a non-leader member to leave a team', async () => {
    teamRepository.findMember.mockResolvedValueOnce({
      teamId: 'team-1',
      userId: 'member-1',
    });

    const result = await service.leaveTeam('team-1', 'member-1');

    expect(teamRepository.deleteMembership).toHaveBeenCalledWith(
      'team-1',
      'member-1',
      transactionClient,
    );
    expect(result).toEqual({
      teamId: 'team-1',
      userId: 'member-1',
      left: true,
    });
  });

  it('rejects leave-team when membership does not exist', async () => {
    teamRepository.findMember.mockResolvedValueOnce(null);

    await expect(
      service.leaveTeam('team-1', 'member-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects leave-team for the current leader', async () => {
    teamRepository.findMember.mockResolvedValueOnce({
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
      name: 'Alpha Team',
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
    expect(teamRepository.findMember).toHaveBeenCalledWith(
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
    teamRepository.findMember.mockResolvedValueOnce(null);

    await expect(
      service.transferLeadership('team-1', 'leader-1', 'missing-member'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(teamRepository.updateLeader).not.toHaveBeenCalled();
  });

  it('rejects leadership transfer for a locked team', async () => {
    teamRepository.findUnique.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Alpha Team',
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

  it('rejects leave-team when membership disappears before delete', async () => {
    teamRepository.deleteMembership.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.leaveTeam('team-1', 'member-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

jest.mock('../../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock('../../user/user.service', () => ({
  UserService: class UserService {},
}));
jest.mock('./system-invitation.repository', () => ({
  SystemInvitationRepository: class SystemInvitationRepository {},
}));
jest.mock('../../infrastructure/hashing', () => ({
  HashingService: class HashingService {},
}));
jest.mock('../../infrastructure/config', () => ({
  ConfigService: class ConfigService {},
}));
jest.mock('../../infrastructure/queue', () => ({
  QueueService: class QueueService {},
  EMAIL_JOBS: {
    SYSTEM_INVITE_SENT: 'system-invite-sent',
  },
}));

import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  SystemInvitationStatus,
  UserRole,
  UserStatus,
} from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { ConfigService } from '../../infrastructure/config';
import { HashingService } from '../../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../../infrastructure/queue';
import { UserService } from '../../user/user.service';
import { AdminInvitesService } from './admin-invites.service';
import {
  SYSTEM_INVITABLE_ROLES,
  type SystemInvitableRole,
} from './dto/create-system-invite.dto';
import { SystemInvitationRepository } from './system-invitation.repository';

describe('AdminInvitesService', () => {
  let service: AdminInvitesService;
  let usersService: {
    findByEmail: jest.Mock;
  };
  let systemInvitations: {
    findActiveByEmailAndRole: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  let hashingService: {
    generateHexToken: jest.Mock;
  };
  let configService: {
    tokenByteLength: number;
    systemInvitationExpirationHours: number;
  };
  let queueService: {
    addEmail: jest.Mock;
  };

  const actorAdmin: AuthenticatedUserContext = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  };
  const actorSuperAdmin: AuthenticatedUserContext = {
    id: 'super-admin-1',
    email: 'superadmin@example.com',
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
  };
  type CreateSystemInvitationInput = {
    email: string;
    roleToAssign: UserRole;
    token: string;
    status: SystemInvitationStatus;
    invitedById: string;
    expiresAt: Date;
  };

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
    };
    systemInvitations = {
      findActiveByEmailAndRole: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      delete: jest.fn(),
    };
    hashingService = {
      generateHexToken: jest.fn().mockReturnValue('generated-token'),
    };
    configService = {
      tokenByteLength: 32,
      systemInvitationExpirationHours: 72,
    };
    queueService = {
      addEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new AdminInvitesService(
      usersService as unknown as UserService,
      systemInvitations as unknown as SystemInvitationRepository,
      hashingService as unknown as HashingService,
      configService as unknown as ConfigService,
      queueService as unknown as QueueService,
    );
  });

  it('creates mentor invite for admin and enqueues email job', async () => {
    systemInvitations.create.mockResolvedValue({
      id: 'invite-1',
      email: 'mentor@example.com',
      roleToAssign: UserRole.MENTOR,
      token: 'generated-token',
      status: SystemInvitationStatus.PENDING,
      invitedById: actorAdmin.id,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-04T00:00:00.000Z'),
      acceptedAt: null,
      revokedAt: null,
    });

    const result = await service.createInvite(actorAdmin, {
      email: 'mentor@example.com',
      roleToAssign: SYSTEM_INVITABLE_ROLES.MENTOR,
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith('mentor@example.com');
    expect(systemInvitations.findActiveByEmailAndRole).toHaveBeenCalledWith(
      'mentor@example.com',
      UserRole.MENTOR,
    );
    expect(systemInvitations.create).toHaveBeenCalledTimes(1);
    const [createPayload] = systemInvitations.create.mock.calls[0] as [
      CreateSystemInvitationInput,
    ];
    expect(createPayload).toMatchObject({
      email: 'mentor@example.com',
      roleToAssign: UserRole.MENTOR,
      token: 'generated-token',
      status: SystemInvitationStatus.PENDING,
      invitedById: actorAdmin.id,
    });
    expect(createPayload.expiresAt).toBeInstanceOf(Date);
    expect(queueService.addEmail).toHaveBeenCalledWith(
      EMAIL_JOBS.SYSTEM_INVITE_SENT,
      {
        email: 'mentor@example.com',
        token: 'generated-token',
        roleToAssign: UserRole.MENTOR,
      },
    );
    expect(result).toEqual({
      id: 'invite-1',
      email: 'mentor@example.com',
      roleToAssign: UserRole.MENTOR,
      status: SystemInvitationStatus.PENDING,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-04T00:00:00.000Z'),
    });
  });

  it('rejects admin inviting admin role', async () => {
    await expect(
      service.createInvite(actorAdmin, {
        email: 'admin2@example.com',
        roleToAssign: SYSTEM_INVITABLE_ROLES.ADMIN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(systemInvitations.create).not.toHaveBeenCalled();
  });

  it('allows super admin to invite admin role', async () => {
    systemInvitations.create.mockResolvedValue({
      id: 'invite-admin',
      email: 'admin2@example.com',
      roleToAssign: UserRole.ADMIN,
      token: 'generated-token',
      status: SystemInvitationStatus.PENDING,
      invitedById: actorSuperAdmin.id,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-04T00:00:00.000Z'),
      acceptedAt: null,
      revokedAt: null,
    });

    await service.createInvite(actorSuperAdmin, {
      email: 'admin2@example.com',
      roleToAssign: SYSTEM_INVITABLE_ROLES.ADMIN,
    });

    expect(systemInvitations.create).toHaveBeenCalledTimes(1);
    const [adminInvitePayload] = systemInvitations.create.mock.calls[0] as [
      CreateSystemInvitationInput,
    ];
    expect(adminInvitePayload).toMatchObject({
      email: 'admin2@example.com',
      roleToAssign: UserRole.ADMIN,
      token: 'generated-token',
      status: SystemInvitationStatus.PENDING,
      invitedById: actorSuperAdmin.id,
    });
    expect(adminInvitePayload.expiresAt).toBeInstanceOf(Date);
  });

  it('throws conflict when user with email already exists', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'mentor@example.com',
    });

    await expect(
      service.createInvite(actorSuperAdmin, {
        email: 'mentor@example.com',
        roleToAssign: SYSTEM_INVITABLE_ROLES.MENTOR,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(systemInvitations.create).not.toHaveBeenCalled();
  });

  it('throws conflict when active invite already exists for email and role', async () => {
    systemInvitations.findActiveByEmailAndRole.mockResolvedValue({
      id: 'invite-1',
    });

    await expect(
      service.createInvite(actorSuperAdmin, {
        email: 'mentor@example.com',
        roleToAssign: SYSTEM_INVITABLE_ROLES.MENTOR as SystemInvitableRole,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(systemInvitations.create).not.toHaveBeenCalled();
  });

  it('rolls back invitation when enqueueing email fails', async () => {
    const enqueueError = new Error('queue unavailable');
    queueService.addEmail.mockRejectedValue(enqueueError);
    systemInvitations.create.mockResolvedValue({
      id: 'invite-rollback',
      email: 'mentor@example.com',
      roleToAssign: UserRole.MENTOR,
      token: 'generated-token',
      status: SystemInvitationStatus.PENDING,
      invitedById: actorSuperAdmin.id,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-04T00:00:00.000Z'),
      acceptedAt: null,
      revokedAt: null,
    });

    await expect(
      service.createInvite(actorSuperAdmin, {
        email: 'mentor@example.com',
        roleToAssign: SYSTEM_INVITABLE_ROLES.MENTOR,
      }),
    ).rejects.toThrow(enqueueError);

    expect(systemInvitations.delete).toHaveBeenCalledWith({
      id: 'invite-rollback',
    });
  });
});

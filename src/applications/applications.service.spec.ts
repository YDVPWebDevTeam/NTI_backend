jest.mock('./applications.repository', () => ({
  ApplicationsRepository: class ApplicationsRepository {},
}));

jest.mock('./application-rules.service', () => ({
  ApplicationRulesService: class ApplicationRulesService {},
}));

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, UserRole } from '../../generated/prisma/enums';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let applicationsRepository: {
    findActiveByTeamAndCall: jest.Mock;
    createDraft: jest.Mock;
    findByIdWithRelations: jest.Mock;
    transaction: jest.Mock;
  };
  let applicationRulesService: {
    validateApplicationCreationRules: jest.Mock;
  };

  const mockCall = {
    id: 'call-1',
    type: 'PROGRAM_A',
    title: 'Test Call',
    status: 'OPEN',
    opensAt: new Date('2026-04-10T00:00:00.000Z'),
    closesAt: new Date('2026-04-30T23:59:59.000Z'),
  };

  const mockTeam = {
    id: 'team-1',
    name: 'Test Team',
    leaderId: 'user-1',
    archivedAt: null,
    members: [{ userId: 'user-1' }, { userId: 'user-2' }],
  };

  beforeEach(() => {
    applicationsRepository = {
      findActiveByTeamAndCall: jest.fn(),
      createDraft: jest.fn(),
      findByIdWithRelations: jest.fn(),
      transaction: jest.fn(),
    };

    applicationRulesService = {
      validateApplicationCreationRules: jest.fn().mockResolvedValue({
        call: mockCall,
        team: mockTeam,
      }),
    };

    service = new ApplicationsService(
      applicationsRepository as never,
      applicationRulesService as never,
    );
  });

  it('validates rules before creating draft application', async () => {
    const transactionClient = { tx: 'db-client' } as never;

    applicationsRepository.transaction.mockImplementation(
      (fn: (db: never) => Promise<unknown>) => {
        applicationsRepository.findActiveByTeamAndCall.mockResolvedValue(null);
        applicationsRepository.createDraft.mockResolvedValue({
          id: 'application-1',
          callId: 'call-1',
          teamId: 'team-1',
          createdById: 'user-1',
          status: ApplicationStatus.DRAFT,
          submittedAt: null,
          decidedAt: null,
          createdAt: new Date('2026-04-20T12:00:00.000Z'),
          updatedAt: new Date('2026-04-20T12:00:00.000Z'),
        });
        return fn(transactionClient);
      },
    );

    const result = await service.createDraft(
      { id: 'user-1', email: 'lead@example.com' } as never,
      { callId: 'call-1', teamId: 'team-1' },
    );

    expect(
      applicationRulesService.validateApplicationCreationRules,
    ).toHaveBeenCalledWith('call-1', 'team-1', 'user-1');
    expect(applicationsRepository.findActiveByTeamAndCall).toHaveBeenCalledWith(
      'team-1',
      'call-1',
      expect.any(Array),
      transactionClient,
    );
    expect(applicationsRepository.createDraft).toHaveBeenCalledWith(
      'call-1',
      'team-1',
      'user-1',
      transactionClient,
    );
    expect(result.id).toBe('application-1');
  });

  it('throws conflict when active duplicate exists inside transaction', async () => {
    applicationsRepository.transaction.mockImplementation(
      (fn: (db: never) => Promise<unknown>) => {
        applicationsRepository.findActiveByTeamAndCall.mockResolvedValue({
          id: 'application-1',
          status: ApplicationStatus.DRAFT,
        });
        return fn(null as never);
      },
    );

    await expect(
      service.createDraft(
        { id: 'user-1', email: 'lead@example.com' } as never,
        { callId: 'call-1', teamId: 'team-1' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps prisma unique violation to conflict exception for concurrent creates', async () => {
    applicationsRepository.transaction.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.createDraft(
        { id: 'user-1', email: 'lead@example.com' } as never,
        { callId: 'call-1', teamId: 'team-1' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows non-unique transaction errors', async () => {
    const dbError = new Error('database unavailable');
    applicationsRepository.transaction.mockRejectedValue(dbError);

    await expect(
      service.createDraft(
        { id: 'user-1', email: 'lead@example.com' } as never,
        { callId: 'call-1', teamId: 'team-1' },
      ),
    ).rejects.toThrow('database unavailable');
  });

  it('throws not found when application does not exist', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue(null);

    await expect(
      service.findById('application-404', {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows admin to view any application', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      id: 'application-1',
      callId: 'call-1',
      teamId: 'team-1',
      createdById: 'user-1',
      status: ApplicationStatus.DRAFT,
      submittedAt: null,
      decidedAt: null,
      createdAt: new Date('2026-04-20T12:00:00.000Z'),
      updatedAt: new Date('2026-04-20T12:00:00.000Z'),
      call: mockCall,
      team: mockTeam,
      createdBy: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Lead',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
        status: 'ACTIVE',
      },
    });

    const result = await service.findById('application-1', {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    } as never);

    expect(result.id).toBe('application-1');
  });

  it('allows team lead to view team application', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      id: 'application-1',
      callId: 'call-1',
      teamId: 'team-1',
      createdById: 'user-1',
      status: ApplicationStatus.DRAFT,
      submittedAt: null,
      decidedAt: null,
      createdAt: new Date('2026-04-20T12:00:00.000Z'),
      updatedAt: new Date('2026-04-20T12:00:00.000Z'),
      call: mockCall,
      team: mockTeam,
      createdBy: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Lead',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
        status: 'ACTIVE',
      },
    });

    const result = await service.findById('application-1', {
      id: 'user-1',
      email: 'lead@example.com',
      role: UserRole.STUDENT,
    } as never);

    expect(result.id).toBe('application-1');
  });

  it('allows team member to view team application', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      id: 'application-1',
      callId: 'call-1',
      teamId: 'team-1',
      createdById: 'user-1',
      status: ApplicationStatus.DRAFT,
      submittedAt: null,
      decidedAt: null,
      createdAt: new Date('2026-04-20T12:00:00.000Z'),
      updatedAt: new Date('2026-04-20T12:00:00.000Z'),
      call: mockCall,
      team: mockTeam,
      createdBy: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Lead',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
        status: 'ACTIVE',
      },
    });

    const result = await service.findById('application-1', {
      id: 'user-2',
      email: 'member@example.com',
      role: UserRole.STUDENT,
    } as never);

    expect(result.id).toBe('application-1');
  });

  it('forbids non-team member from viewing application', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      id: 'application-1',
      callId: 'call-1',
      teamId: 'team-1',
      createdById: 'user-1',
      status: ApplicationStatus.DRAFT,
      submittedAt: null,
      decidedAt: null,
      createdAt: new Date('2026-04-20T12:00:00.000Z'),
      updatedAt: new Date('2026-04-20T12:00:00.000Z'),
      call: mockCall,
      team: mockTeam,
      createdBy: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Lead',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
        status: 'ACTIVE',
      },
    });

    await expect(
      service.findById('application-1', {
        id: 'user-3',
        email: 'outsider@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propagates validation errors from rules service', async () => {
    const validationError = new ForbiddenException('Only team lead can submit');
    applicationRulesService.validateApplicationCreationRules.mockRejectedValue(
      validationError,
    );

    await expect(
      service.createDraft(
        { id: 'user-2', email: 'member@example.com' } as never,
        { callId: 'call-1', teamId: 'team-1' },
      ),
    ).rejects.toThrow('Only team lead can submit');
  });
});

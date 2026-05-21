jest.mock('./applications.repository', () => ({
  ApplicationsRepository: class ApplicationsRepository {},
}));

jest.mock('./application-sections.repository', () => ({
  ApplicationSectionsRepository: class ApplicationSectionsRepository {},
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, UserRole } from '../../generated/prisma/enums';
import { ApplicationSectionsService } from './application-sections.service';
import { ApplicationSectionsRulesService } from './rules/application-sections-rules.service';

describe('ApplicationSectionsService', () => {
  let service: ApplicationSectionsService;
  let applicationsRepository: {
    findByIdWithRelations: jest.Mock;
    transaction: jest.Mock;
  };
  let sectionsRepository: {
    findByApplicationId: jest.Mock;
    findByApplicationIdAndKey: jest.Mock;
    findHistoryBySectionId: jest.Mock;
    findHistoryEntriesBulk: jest.Mock;
    findHistoryEntry: jest.Mock;
    upsertSection: jest.Mock;
    createHistoryEntry: jest.Mock;
    setActiveVersion: jest.Mock;
  };
  let sectionsRules: {
    assertReadAccess: jest.Mock;
    assertWriteAccess: jest.Mock;
    assertAdminAccess: jest.Mock;
    assertApplicationIsDraft: jest.Mock;
  };

  const mockApplication = {
    id: 'application-1',
    callId: 'call-1',
    teamId: 'team-1',
    createdById: 'user-1',
    status: 'DRAFT',
    submittedAt: null,
    decidedAt: null,
    createdAt: new Date('2026-04-20T12:00:00.000Z'),
    updatedAt: new Date('2026-04-20T12:00:00.000Z'),
    call: {
      id: 'call-1',
      type: 'PROGRAM_A',
      title: 'Test Call',
      status: 'OPEN',
      opensAt: new Date('2026-04-10T00:00:00.000Z'),
      closesAt: new Date('2026-04-30T23:59:59.000Z'),
    },
    team: {
      id: 'team-1',
      name: 'Test Team',
      leaderId: 'user-1',
      archivedAt: null,
      members: [{ userId: 'user-1' }, { userId: 'user-2' }],
    },
    createdBy: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Lead',
      email: 'lead@example.com',
      role: UserRole.STUDENT,
      status: 'ACTIVE',
    },
  };

  const baseSection = {
    id: 'section-1',
    applicationId: 'application-1',
    key: 'profile',
    valueJson: { name: 'John' },
    version: 2,
    activeVersion: null,
    updatedById: 'user-1',
    updatedAt: new Date('2026-04-20T12:00:00.000Z'),
  };

  beforeEach(() => {
    applicationsRepository = {
      findByIdWithRelations: jest.fn(),
      transaction: jest.fn(),
    };

    sectionsRepository = {
      findByApplicationId: jest.fn(),
      findByApplicationIdAndKey: jest.fn(),
      findHistoryBySectionId: jest.fn(),
      findHistoryEntriesBulk: jest.fn().mockResolvedValue([]),
      findHistoryEntry: jest.fn(),
      upsertSection: jest.fn(),
      createHistoryEntry: jest.fn(),
      setActiveVersion: jest.fn(),
    };

    sectionsRules = {
      assertReadAccess: jest.fn(),
      assertWriteAccess: jest.fn(),
      assertAdminAccess: jest.fn(),
      assertApplicationIsDraft: jest.fn(),
    };

    service = new ApplicationSectionsService(
      applicationsRepository as never,
      sectionsRepository as never,
      sectionsRules as ApplicationSectionsRulesService,
    );
  });

  it('listSections returns sections for team member', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertReadAccess.mockImplementation(() => undefined);
    sectionsRepository.findByApplicationId.mockResolvedValue([baseSection]);

    const result = await service.listSections('application-1', {
      id: 'user-2',
      email: 'member@example.com',
      role: UserRole.STUDENT,
    } as never);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('profile');
    expect(result[0].version).toBe(2);
    expect(sectionsRepository.findByApplicationId).toHaveBeenCalledWith(
      'application-1',
    );
  });

  it('listSections resolves activeVersion from history', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertReadAccess.mockImplementation(() => undefined);
    sectionsRepository.findByApplicationId.mockResolvedValue([
      {
        ...baseSection,
        activeVersion: 1,
        valueJson: { name: 'John' },
      },
    ]);
    sectionsRepository.findHistoryEntriesBulk.mockResolvedValue([
      {
        id: 'history-1',
        sectionId: 'section-1',
        version: 1,
        valueJson: { name: 'Jane' },
        savedById: 'user-1',
        createdAt: new Date('2026-04-19T12:00:00.000Z'),
      },
    ]);

    const result = await service.listSections('application-1', {
      id: 'user-1',
      email: 'lead@example.com',
      role: UserRole.STUDENT,
    } as never);

    expect(result[0].valueJson).toEqual({ name: 'Jane' });
    expect(sectionsRepository.findHistoryEntriesBulk).toHaveBeenCalledWith([
      { sectionId: 'section-1', version: 1 },
    ]);
  });

  it('listSections forbids non-member', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertReadAccess.mockImplementation(() => undefined);
    sectionsRules.assertReadAccess.mockImplementation(() => {
      throw new ForbiddenException(
        'You do not have permission to view this application',
      );
    });

    await expect(
      service.listSections('application-1', {
        id: 'user-3',
        email: 'outsider@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(sectionsRepository.findByApplicationId).not.toHaveBeenCalled();
  });

  it('listSections throws not found when application is missing', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue(null);

    await expect(
      service.listSections('application-404', {
        id: 'user-1',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('upsertSection writes via transaction and returns dto', async () => {
    const transactionClient = { tx: 'db-client' } as never;

    applicationsRepository.transaction.mockImplementation(
      (fn: (db: never) => Promise<unknown>) => fn(transactionClient),
    );
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertApplicationIsDraft.mockImplementation(() => undefined);
    sectionsRules.assertWriteAccess.mockImplementation(() => undefined);
    sectionsRepository.upsertSection.mockResolvedValue({
      ...baseSection,
      activeVersion: null,
    });
    sectionsRepository.createHistoryEntry.mockResolvedValue({
      id: 'history-1',
    });
    sectionsRepository.setActiveVersion.mockResolvedValue({
      ...baseSection,
      activeVersion: 2,
    });

    const result = await service.upsertSection(
      'application-1',
      'profile',
      {
        valueJson: { name: 'Jane' },
      },
      {
        id: 'user-1',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
      } as never,
    );

    expect(applicationsRepository.transaction).toHaveBeenCalledTimes(1);
    expect(sectionsRepository.upsertSection).toHaveBeenCalledWith(
      'application-1',
      'profile',
      { name: 'Jane' },
      'user-1',
      transactionClient,
    );
    expect(sectionsRepository.createHistoryEntry).toHaveBeenCalledWith(
      'section-1',
      2,
      { name: 'Jane' },
      'user-1',
      transactionClient,
    );
    expect(sectionsRepository.setActiveVersion).toHaveBeenCalledWith(
      'section-1',
      2,
      transactionClient,
    );
    expect(result.key).toBe('profile');
  });

  it('upsertSection forbids non-lead', async () => {
    const transactionClient = { tx: 'db-client' } as never;

    applicationsRepository.transaction.mockImplementation(
      (fn: (db: never) => Promise<unknown>) => fn(transactionClient),
    );
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertApplicationIsDraft.mockImplementation(() => undefined);
    sectionsRules.assertWriteAccess.mockImplementation(() => {
      throw new ForbiddenException(
        'Only team lead can update application sections',
      );
    });

    await expect(
      service.upsertSection(
        'application-1',
        'profile',
        {
          valueJson: { name: 'Jane' },
        },
        {
          id: 'user-2',
          email: 'member@example.com',
          role: UserRole.STUDENT,
        } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(sectionsRepository.upsertSection).not.toHaveBeenCalled();
  });

  it('upsertSection forbids non-draft applications', async () => {
    const transactionClient = { tx: 'db-client' } as never;

    applicationsRepository.transaction.mockImplementation(
      (fn: (db: never) => Promise<unknown>) => fn(transactionClient),
    );
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...mockApplication,
      status: ApplicationStatus.SUBMITTED,
    });
    sectionsRules.assertApplicationIsDraft.mockImplementation(() => {
      throw new BadRequestException(
        'Only draft applications can be modified (status: SUBMITTED)',
      );
    });

    await expect(
      service.upsertSection(
        'application-1',
        'profile',
        {
          valueJson: { name: 'Jane' },
        },
        {
          id: 'user-1',
          email: 'lead@example.com',
          role: UserRole.STUDENT,
        } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(sectionsRepository.upsertSection).not.toHaveBeenCalled();
  });

  it('upsertSection rejects unsupported section keys', async () => {
    const transactionClient = { tx: 'db-client' } as never;

    applicationsRepository.transaction.mockImplementation(
      (fn: (db: never) => Promise<unknown>) => fn(transactionClient),
    );
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertApplicationIsDraft.mockImplementation(() => undefined);
    sectionsRules.assertWriteAccess.mockImplementation(() => undefined);

    await expect(
      service.upsertSection(
        'application-1',
        'unknown' as never,
        {
          valueJson: { name: 'Jane' },
        },
        {
          id: 'user-1',
          email: 'lead@example.com',
          role: UserRole.STUDENT,
        } as never,
      ),
    ).rejects.toThrow('Unsupported application section key: unknown');

    expect(sectionsRepository.upsertSection).not.toHaveBeenCalled();
  });

  it('upsertSection rejects invalid profile payload shape', async () => {
    const transactionClient = { tx: 'db-client' } as never;

    applicationsRepository.transaction.mockImplementation(
      (fn: (db: never) => Promise<unknown>) => fn(transactionClient),
    );
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertApplicationIsDraft.mockImplementation(() => undefined);
    sectionsRules.assertWriteAccess.mockImplementation(() => undefined);

    await expect(
      service.upsertSection(
        'application-1',
        'profile',
        {
          valueJson: { firstName: 'Jane' } as never,
        },
        {
          id: 'user-1',
          email: 'lead@example.com',
          role: UserRole.STUDENT,
        } as never,
      ),
    ).rejects.toThrow(
      'Profile section payload must be an object with a non-empty string "name" field.',
    );

    expect(sectionsRepository.upsertSection).not.toHaveBeenCalled();
  });

  it('getSectionHistory requires admin', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertAdminAccess.mockImplementation(() => undefined);
    sectionsRules.assertAdminAccess.mockImplementation(() => {
      throw new ForbiddenException('Admin access required');
    });

    await expect(
      service.getSectionHistory('application-1', 'profile', {
        id: 'user-2',
        email: 'member@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(sectionsRepository.findByApplicationIdAndKey).not.toHaveBeenCalled();
  });

  it('getSectionHistory returns history for admin', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertAdminAccess.mockImplementation(() => undefined);
    sectionsRepository.findByApplicationIdAndKey.mockResolvedValue(baseSection);
    sectionsRepository.findHistoryBySectionId.mockResolvedValue([
      {
        id: 'history-2',
        sectionId: 'section-1',
        version: 2,
        valueJson: { name: 'Jane 2' },
        savedById: 'user-1',
        createdAt: new Date('2026-04-20T12:00:00.000Z'),
      },
      {
        id: 'history-1',
        sectionId: 'section-1',
        version: 1,
        valueJson: { name: 'Jane 1' },
        savedById: 'user-1',
        createdAt: new Date('2026-04-19T12:00:00.000Z'),
      },
    ]);

    const result = await service.getSectionHistory('application-1', 'profile', {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    } as never);

    expect(result).toHaveLength(2);
    expect(result[0].version).toBe(2);
    expect(sectionsRepository.findHistoryBySectionId).toHaveBeenCalledWith(
      'section-1',
    );
  });

  it('setActiveVersion rejects non-existent version', async () => {
    const transactionClient = { tx: 'db-client' } as never;

    applicationsRepository.transaction.mockImplementation(
      (fn: (db: never) => Promise<unknown>) => fn(transactionClient),
    );
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertAdminAccess.mockImplementation(() => undefined);
    sectionsRepository.findByApplicationIdAndKey.mockResolvedValue(baseSection);
    sectionsRepository.findHistoryEntry.mockResolvedValue(null);

    await expect(
      service.setActiveVersion('application-1', 'profile', { version: 99 }, {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(sectionsRepository.setActiveVersion).not.toHaveBeenCalled();
  });

  it('setActiveVersion pins version for admin', async () => {
    const transactionClient = { tx: 'db-client' } as never;
    const updatedSection = {
      ...baseSection,
      activeVersion: 1,
    };
    const historyEntry = {
      id: 'history-1',
      sectionId: 'section-1',
      version: 1,
      valueJson: { name: 'Pinned' },
      savedById: 'user-1',
      createdAt: new Date('2026-04-19T12:00:00.000Z'),
    };

    applicationsRepository.transaction.mockImplementation(
      (fn: (db: never) => Promise<unknown>) => fn(transactionClient),
    );
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertAdminAccess.mockImplementation(() => undefined);
    sectionsRepository.findByApplicationIdAndKey
      .mockResolvedValueOnce(baseSection)
      .mockResolvedValueOnce(updatedSection);
    sectionsRepository.findHistoryEntry.mockResolvedValue(historyEntry);
    sectionsRepository.setActiveVersion.mockResolvedValue(updatedSection);

    const result = await service.setActiveVersion(
      'application-1',
      'profile',
      { version: 1 },
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as never,
    );

    expect(sectionsRepository.setActiveVersion).toHaveBeenCalledWith(
      'section-1',
      1,
      transactionClient,
    );
    expect(result.valueJson).toEqual({ name: 'Pinned' });
  });

  it('listSections rejects persisted unsupported section keys', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      mockApplication,
    );
    sectionsRules.assertReadAccess.mockImplementation(() => undefined);
    sectionsRepository.findByApplicationId.mockResolvedValue([
      { ...baseSection, key: 'legacy' },
    ]);

    await expect(
      service.listSections('application-1', {
        id: 'user-2',
        email: 'member@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toThrow('Unsupported application section key: legacy');
  });
});

jest.mock('./applications.repository', () => ({
  ApplicationsRepository: class ApplicationsRepository {},
}));

jest.mock('./application-documents.repository', () => ({
  ApplicationDocumentsRepository: class ApplicationDocumentsRepository {},
}));

jest.mock('./application-rules.service', () => ({
  ApplicationRulesService: class ApplicationRulesService {},
}));

jest.mock('./calls.repository', () => ({
  CallsRepository: class CallsRepository {},
}));

jest.mock('../team/team.repository', () => ({
  TeamRepository: class TeamRepository {},
}));

jest.mock('../files/files.repository', () => ({
  FilesRepository: class FilesRepository {},
}));

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationDocumentScope,
  ApplicationStatus,
  DocumentType,
  ProgramType,
  UploadStatus,
  UserRole,
} from '../../generated/prisma/enums';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let applicationsRepository: {
    findActiveByTeamAndCall: jest.Mock;
    createDraft: jest.Mock;
    findByIdWithRelations: jest.Mock;
    findByIdForWorkflow: jest.Mock;
    submitDraft: jest.Mock;
    transaction: jest.Mock;
  };
  let applicationDocumentsRepository: {
    deactivateActiveBySlot: jest.Mock;
    findLatestVersionNumberBySlot: jest.Mock;
    createVersioned: jest.Mock;
  };
  let applicationRulesService: {
    validateApplicationCreationRules: jest.Mock;
    ensureCallOpenForApplications: jest.Mock;
  };
  let callsRepository: {
    findByIdWithRequiredDocumentTypes: jest.Mock;
  };
  let teamRepository: {
    update: jest.Mock;
  };
  let filesRepository: {
    findByIdForOwners: jest.Mock;
  };

  const mockCall = {
    id: 'call-1',
    type: ProgramType.PROGRAM_A,
    title: 'Test Call',
    status: 'OPEN',
    opensAt: new Date('2026-04-10T00:00:00.000Z'),
    closesAt: new Date('2026-04-30T23:59:59.000Z'),
    requiredDocumentTypes: [
      { id: 'req-1', documentType: DocumentType.BUDGET, isRequired: true },
      { id: 'req-2', documentType: DocumentType.CV, isRequired: true },
      {
        id: 'req-3',
        documentType: DocumentType.MOTIVATION_LETTER,
        isRequired: true,
      },
    ],
  };

  const mockTeam = {
    id: 'team-1',
    name: 'Test Team',
    leaderId: 'user-1',
    lockedAt: null,
    archivedAt: null,
    members: [{ userId: 'user-1' }, { userId: 'user-2' }],
  };

  const workflowApplication = {
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
    documents: [],
  };

  const detailApplication = {
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
  };

  beforeEach(() => {
    applicationsRepository = {
      findActiveByTeamAndCall: jest.fn(),
      createDraft: jest.fn(),
      findByIdWithRelations: jest.fn(),
      findByIdForWorkflow: jest.fn(),
      submitDraft: jest.fn(),
      transaction: jest.fn((fn: (db: never) => Promise<unknown>) =>
        fn({ tx: 'db-client' } as never),
      ),
    };

    applicationDocumentsRepository = {
      deactivateActiveBySlot: jest.fn().mockResolvedValue(undefined),
      findLatestVersionNumberBySlot: jest
        .fn()
        .mockResolvedValue({ version: 1 }),
      createVersioned: jest.fn(),
    };

    applicationRulesService = {
      validateApplicationCreationRules: jest.fn().mockResolvedValue(undefined),
      ensureCallOpenForApplications: jest.fn(),
    };

    callsRepository = {
      findByIdWithRequiredDocumentTypes: jest.fn(),
    };

    teamRepository = {
      update: jest.fn().mockResolvedValue(undefined),
    };

    filesRepository = {
      findByIdForOwners: jest.fn(),
    };

    service = new ApplicationsService(
      applicationsRepository as never,
      applicationDocumentsRepository as never,
      applicationRulesService as never,
      callsRepository as never,
      teamRepository as never,
      filesRepository as never,
    );
  });

  it('validates rules before creating draft application', async () => {
    applicationsRepository.findActiveByTeamAndCall.mockResolvedValue(null);
    applicationsRepository.createDraft.mockResolvedValue(detailApplication);

    const result = await service.createDraft(
      { id: 'user-1', email: 'lead@example.com' } as never,
      { callId: 'call-1', teamId: 'team-1' },
    );

    expect(
      applicationRulesService.validateApplicationCreationRules,
    ).toHaveBeenCalledWith('call-1', 'team-1', 'user-1', { tx: 'db-client' });
    expect(result.id).toBe('application-1');
  });

  it('returns required documents for a Program A call', async () => {
    callsRepository.findByIdWithRequiredDocumentTypes.mockResolvedValue(
      mockCall,
    );

    const result = await service.getRequiredDocumentsForCall('call-1');

    expect(result.requiredDocuments).toHaveLength(3);
    expect(result.programType).toBe(ProgramType.PROGRAM_A);
  });

  it('throws not found when required-document call does not exist', async () => {
    callsRepository.findByIdWithRequiredDocumentTypes.mockResolvedValue(null);

    await expect(
      service.getRequiredDocumentsForCall('missing-call'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('attaches an application-level document for the team lead', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue(
      workflowApplication,
    );
    filesRepository.findByIdForOwners.mockResolvedValue({
      id: 'file-1',
      ownerId: 'user-1',
      status: UploadStatus.UPLOADED,
    });
    applicationDocumentsRepository.createVersioned.mockResolvedValue({
      id: 'doc-1',
      applicationId: 'application-1',
      uploadedFileId: 'file-1',
      documentType: DocumentType.BUDGET,
      documentScope: ApplicationDocumentScope.APPLICATION,
      memberUserId: null,
      version: 2,
      isActive: true,
      createdById: 'user-1',
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      uploadedFile: {
        id: 'file-1',
        ownerId: 'user-1',
        key: 'key',
        originalName: 'budget.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        visibility: 'PRIVATE',
        status: UploadStatus.UPLOADED,
        uploadedAt: new Date('2026-05-02T09:00:00.000Z'),
      },
    });

    const result = await service.attachDocument(
      'application-1',
      {
        id: 'user-1',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
      } as never,
      { fileId: 'file-1', documentType: DocumentType.BUDGET },
    );

    expect(filesRepository.findByIdForOwners).toHaveBeenCalledWith(
      'file-1',
      ['user-1'],
      { tx: 'db-client' },
    );
    expect(result.documentScope).toBe(ApplicationDocumentScope.APPLICATION);
    expect(result.version).toBe(2);
  });

  it('rejects CV attachment without memberUserId', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue(
      workflowApplication,
    );

    await expect(
      service.attachDocument(
        'application-1',
        {
          id: 'user-1',
          email: 'lead@example.com',
          role: UserRole.STUDENT,
        } as never,
        { fileId: 'file-1', documentType: DocumentType.CV },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects document attachment when application is already submitted', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.SUBMITTED,
      submittedAt: new Date('2026-05-02T11:00:00.000Z'),
    });

    await expect(
      service.attachDocument(
        'application-1',
        {
          id: 'user-1',
          email: 'lead@example.com',
          role: UserRole.STUDENT,
        } as never,
        { fileId: 'file-1', documentType: DocumentType.BUDGET },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('calculates exact missing Program A documents', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      documents: [
        {
          id: 'doc-1',
          documentType: DocumentType.BUDGET,
          documentScope: ApplicationDocumentScope.APPLICATION,
          memberUserId: null,
          version: 1,
          isActive: true,
          uploadedFileId: 'file-1',
          createdAt: new Date('2026-05-02T09:00:00.000Z'),
        },
      ],
    });

    const result = await service.getDocumentCompleteness('application-1', {
      id: 'user-1',
      email: 'lead@example.com',
      role: UserRole.STUDENT,
    } as never);

    expect(result.isComplete).toBe(false);
    expect(result.satisfiedDocuments).toEqual([
      {
        documentType: DocumentType.BUDGET,
        documentScope: ApplicationDocumentScope.APPLICATION,
        memberUserId: null,
      },
    ]);
    expect(result.missingDocuments).toEqual(
      expect.arrayContaining([
        {
          documentType: DocumentType.CV,
          documentScope: ApplicationDocumentScope.TEAM_MEMBER,
          memberUserId: 'user-1',
        },
        {
          documentType: DocumentType.CV,
          documentScope: ApplicationDocumentScope.TEAM_MEMBER,
          memberUserId: 'user-2',
        },
        {
          documentType: DocumentType.MOTIVATION_LETTER,
          documentScope: ApplicationDocumentScope.APPLICATION,
          memberUserId: null,
        },
      ]),
    );
  });

  it('allows admin to view any application', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      detailApplication,
    );

    const result = await service.findById('application-1', {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    } as never);

    expect(result.id).toBe('application-1');
  });

  it('forbids non-team member from viewing application', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      detailApplication,
    );

    await expect(
      service.findById('application-1', {
        id: 'user-3',
        email: 'outsider@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('submits a complete draft application and locks the team', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      documents: [
        {
          id: 'doc-1',
          documentType: DocumentType.BUDGET,
          documentScope: ApplicationDocumentScope.APPLICATION,
          memberUserId: null,
          version: 1,
          isActive: true,
          uploadedFileId: 'file-1',
          createdAt: new Date('2026-05-02T09:00:00.000Z'),
        },
        {
          id: 'doc-2',
          documentType: DocumentType.CV,
          documentScope: ApplicationDocumentScope.TEAM_MEMBER,
          memberUserId: 'user-1',
          version: 1,
          isActive: true,
          uploadedFileId: 'file-2',
          createdAt: new Date('2026-05-02T09:00:00.000Z'),
        },
        {
          id: 'doc-3',
          documentType: DocumentType.CV,
          documentScope: ApplicationDocumentScope.TEAM_MEMBER,
          memberUserId: 'user-2',
          version: 1,
          isActive: true,
          uploadedFileId: 'file-3',
          createdAt: new Date('2026-05-02T09:00:00.000Z'),
        },
        {
          id: 'doc-4',
          documentType: DocumentType.MOTIVATION_LETTER,
          documentScope: ApplicationDocumentScope.APPLICATION,
          memberUserId: null,
          version: 1,
          isActive: true,
          uploadedFileId: 'file-4',
          createdAt: new Date('2026-05-02T09:00:00.000Z'),
        },
      ],
    });
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      status: ApplicationStatus.SUBMITTED,
      submittedAt: new Date('2026-05-02T11:00:00.000Z'),
    });

    const result = await service.submit('application-1', {
      id: 'user-1',
      email: 'lead@example.com',
      role: UserRole.STUDENT,
    } as never);

    expect(
      applicationRulesService.ensureCallOpenForApplications,
    ).toHaveBeenCalledWith(mockCall);
    expect(applicationsRepository.submitDraft).toHaveBeenCalled();
    expect(teamRepository.update).toHaveBeenCalled();
    expect(result.status).toBe(ApplicationStatus.SUBMITTED);
  });

  it('rejects submit when Program A application is incomplete', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue(
      workflowApplication,
    );

    await expect(
      service.submit('application-1', {
        id: 'user-1',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

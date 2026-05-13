jest.mock('./applications.repository', () => ({
  ApplicationsRepository: class ApplicationsRepository {},
}));

jest.mock('./application-documents.repository', () => ({
  ApplicationDocumentsRepository: class ApplicationDocumentsRepository {},
}));

jest.mock('./rules/application-rules.service', () => ({
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
  CallStatus,
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
    assignMentor: jest.Mock;
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
    findPublicById: jest.Mock;
    findPublicMany: jest.Mock;
    countPublic: jest.Mock;
    findPublicVisibleMany: jest.Mock;
    countPublicVisible: jest.Mock;
  };
  let teamRepository: {
    update: jest.Mock;
  };
  let filesRepository: {
    findByIdForOwners: jest.Mock;
  };
  let programAMentorshipRepository: {
    createNote: jest.Mock;
    listNotes: jest.Mock;
  };
  let userRepository: {
    findUnique: jest.Mock;
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
    mentorUserId: null,
    mentorAssignedAt: null,
    mentorAssignedById: null,
  };

  const detailApplication = {
    id: 'application-1',
    callId: 'call-1',
    teamId: 'team-1',
    createdById: 'user-1',
    status: ApplicationStatus.DRAFT,
    submittedAt: null,
    decidedAt: null,
    mentorUserId: null,
    mentorAssignedAt: null,
    mentorAssignedById: null,
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
      assignMentor: jest.fn(),
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
      findPublicById: jest.fn(),
      findPublicMany: jest.fn(),
      countPublic: jest.fn(),
      findPublicVisibleMany: jest.fn(),
      countPublicVisible: jest.fn(),
    };

    teamRepository = {
      update: jest.fn().mockResolvedValue(undefined),
    };

    filesRepository = {
      findByIdForOwners: jest.fn(),
    };

    programAMentorshipRepository = {
      createNote: jest.fn(),
      listNotes: jest.fn(),
    };

    userRepository = {
      findUnique: jest.fn(),
    };

    service = new ApplicationsService(
      applicationsRepository as never,
      applicationDocumentsRepository as never,
      applicationRulesService as never,
      callsRepository as never,
      teamRepository as never,
      filesRepository as never,
      {
        createItem: jest.fn(),
        findItemForApplication: jest.fn(),
        createReply: jest.fn(),
        markItemAnswered: jest.fn(),
        findUnresolvedItems: jest.fn(),
        resolveAnsweredItems: jest.fn(),
        getThread: jest.fn(),
        getStatusEvents: jest.fn(),
        createStatusEvent: jest.fn(),
      } as never,
      programAMentorshipRepository as never,
      userRepository as never,
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
    expect(applicationsRepository.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: 'Serializable' },
    );
    expect(result.documentScope).toBe(ApplicationDocumentScope.APPLICATION);
    expect(result.version).toBe(2);
  });

  it('maps concurrent attach unique conflicts to ConflictException', async () => {
    applicationsRepository.transaction.mockRejectedValue({ code: 'P2002' });

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

  it('lists public calls with pagination and optional type filter', async () => {
    callsRepository.findPublicMany.mockResolvedValue([
      {
        id: 'call-1',
        title: 'Public Call',
        type: ProgramType.PROGRAM_A,
        status: CallStatus.OPEN,
        opensAt: null,
        closesAt: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]);
    callsRepository.countPublic.mockResolvedValue(1);

    const result = await service.listPublicCalls({
      page: 1,
      limit: 10,
      type: ProgramType.PROGRAM_A,
      sort: 'createdAt',
      order: 'desc',
    });

    expect(callsRepository.findPublicMany).toHaveBeenCalledWith({
      programType: ProgramType.PROGRAM_A,
      skip: 0,
      take: 10,
      orderBy: [{ createdAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });
    expect(result.meta).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('lists active public calls using visibility repository rules', async () => {
    callsRepository.findPublicVisibleMany.mockResolvedValue([]);
    callsRepository.countPublicVisible.mockResolvedValue(0);

    await service.listActivePublicCalls({
      page: 1,
      limit: 20,
      sort: 'closesAt',
      order: 'asc',
    });

    expect(callsRepository.findPublicVisibleMany).toHaveBeenCalledTimes(1);

    const firstCall = callsRepository.findPublicVisibleMany.mock.calls[0] as [
      {
        now: Date;
        programType: ProgramType | undefined;
        skip: number;
        take: number;
        orderBy: Array<Record<string, 'asc' | 'desc'>>;
      },
    ];

    expect(firstCall[0].now).toBeInstanceOf(Date);
    expect(firstCall[0]).toMatchObject({
      programType: undefined,
      skip: 0,
      take: 20,
      orderBy: [{ closesAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('returns a public call by id', async () => {
    callsRepository.findPublicById.mockResolvedValue({
      id: 'call-1',
      title: 'Public Call',
      type: ProgramType.PROGRAM_B,
      status: CallStatus.OPEN,
      opensAt: null,
      closesAt: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    });

    const result = await service.findPublicCallById('call-1');

    expect(callsRepository.findPublicById).toHaveBeenCalledWith('call-1');
    expect(result.type).toBe(ProgramType.PROGRAM_B);
  });

  it('throws not found when public call cannot be exposed', async () => {
    callsRepository.findPublicById.mockResolvedValue(null);

    await expect(service.findPublicCallById('call-404')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('allows admin to assign mentor on approved Program A application', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
    });
    userRepository.findUnique.mockResolvedValue({
      id: 'mentor-1',
      role: UserRole.MENTOR,
    });
    applicationsRepository.assignMentor.mockResolvedValue({
      id: 'application-1',
      mentorUserId: 'mentor-1',
      mentorAssignedAt: new Date('2026-05-13T10:00:00.000Z'),
      mentorAssignedById: 'admin-1',
    });

    const result = await service.assignMentor(
      'application-1',
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as never,
      { mentorUserId: 'mentor-1' },
    );

    expect(applicationsRepository.assignMentor).toHaveBeenCalledWith(
      'application-1',
      'mentor-1',
      expect.any(Date),
      'admin-1',
      { tx: 'db-client' },
    );
    expect(result).toEqual({
      applicationId: 'application-1',
      mentorUserId: 'mentor-1',
      assignedAt: new Date('2026-05-13T10:00:00.000Z'),
      assignedById: 'admin-1',
    });
  });

  it('rejects mentor assignment for non-Program-A application', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
      call: {
        ...mockCall,
        type: ProgramType.PROGRAM_B,
      },
    });

    await expect(
      service.assignMentor(
        'application-1',
        {
          id: 'admin-1',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        } as never,
        { mentorUserId: 'mentor-1' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects mentor assignment before approval', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.EVALUATING,
    });

    await expect(
      service.assignMentor(
        'application-1',
        {
          id: 'admin-1',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        } as never,
        { mentorUserId: 'mentor-1' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects mentor assignment when target user does not exist', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
    });
    userRepository.findUnique.mockResolvedValue(null);

    await expect(
      service.assignMentor(
        'application-1',
        {
          id: 'admin-1',
          email: 'admin@example.com',
          role: UserRole.SUPER_ADMIN,
        } as never,
        { mentorUserId: 'mentor-404' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects mentor assignment when target user is not a mentor', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
    });
    userRepository.findUnique.mockResolvedValue({
      id: 'user-2',
      role: UserRole.STUDENT,
    });

    await expect(
      service.assignMentor(
        'application-1',
        {
          id: 'admin-1',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        } as never,
        { mentorUserId: 'user-2' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reassignment overwrites current mentor assignment fields', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.ACTIVE_PROJECT,
      mentorUserId: 'mentor-old',
      mentorAssignedAt: new Date('2026-05-01T08:00:00.000Z'),
      mentorAssignedById: 'admin-old',
    });
    userRepository.findUnique.mockResolvedValue({
      id: 'mentor-new',
      role: UserRole.MENTOR,
    });
    applicationsRepository.assignMentor.mockResolvedValue({
      id: 'application-1',
      mentorUserId: 'mentor-new',
      mentorAssignedAt: new Date('2026-05-13T11:00:00.000Z'),
      mentorAssignedById: 'admin-1',
    });

    const result = await service.assignMentor(
      'application-1',
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as never,
      { mentorUserId: 'mentor-new' },
    );

    expect(result.mentorUserId).toBe('mentor-new');
    expect(result.assignedById).toBe('admin-1');
  });

  it('assigned mentor can create mentorship note', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
      mentorUserId: 'mentor-1',
    });
    programAMentorshipRepository.createNote.mockResolvedValue({
      id: 'note-1',
      applicationId: 'application-1',
      authorId: 'mentor-1',
      content: 'Kickoff done',
      createdAt: new Date('2026-05-13T12:00:00.000Z'),
      author: {
        id: 'mentor-1',
        email: 'mentor@example.com',
        firstName: 'Mina',
        lastName: 'Tor',
      },
    });

    const result = await service.createMentorshipNote(
      'application-1',
      {
        id: 'mentor-1',
        email: 'mentor@example.com',
        role: UserRole.MENTOR,
      } as never,
      { content: 'Kickoff done' },
    );

    expect(programAMentorshipRepository.createNote).toHaveBeenCalledWith(
      {
        applicationId: 'application-1',
        authorId: 'mentor-1',
        content: 'Kickoff done',
      },
      { tx: 'db-client' },
    );
    expect(result.author).toEqual({
      id: 'mentor-1',
      email: 'mentor@example.com',
      name: 'Mina Tor',
    });
  });

  it('admin can create mentorship note', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.ONBOARDING,
      mentorUserId: 'mentor-1',
    });
    programAMentorshipRepository.createNote.mockResolvedValue({
      id: 'note-2',
      applicationId: 'application-1',
      authorId: 'admin-1',
      content: 'Admin follow-up',
      createdAt: new Date('2026-05-13T12:30:00.000Z'),
      author: {
        id: 'admin-1',
        email: 'admin@example.com',
        firstName: 'Ada',
        lastName: 'Min',
      },
    });

    const result = await service.createMentorshipNote(
      'application-1',
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as never,
      { content: 'Admin follow-up' },
    );

    expect(result.author.name).toBe('Ada Min');
  });

  it('forbids unassigned mentor from creating mentorship note', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
      mentorUserId: 'mentor-1',
    });

    await expect(
      service.createMentorshipNote(
        'application-1',
        {
          id: 'mentor-2',
          email: 'other-mentor@example.com',
          role: UserRole.MENTOR,
        } as never,
        { content: 'No access' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids team member from creating mentorship note', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
      mentorUserId: 'mentor-1',
    });

    await expect(
      service.createMentorshipNote(
        'application-1',
        {
          id: 'user-2',
          email: 'member@example.com',
          role: UserRole.STUDENT,
        } as never,
        { content: 'No access' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects mentorship note creation when no mentor is assigned', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
      mentorUserId: null,
    });

    await expect(
      service.createMentorshipNote(
        'application-1',
        {
          id: 'admin-1',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        } as never,
        { content: 'No mentor yet' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists mentorship notes in createdAt asc and id asc order', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.PAUSED,
      mentorUserId: 'mentor-1',
    });
    programAMentorshipRepository.listNotes.mockResolvedValue([
      {
        id: 'note-1',
        applicationId: 'application-1',
        authorId: 'mentor-1',
        content: 'First',
        createdAt: new Date('2026-05-13T08:00:00.000Z'),
        author: {
          id: 'mentor-1',
          email: 'mentor@example.com',
          firstName: 'Mina',
          lastName: 'Tor',
        },
      },
      {
        id: 'note-2',
        applicationId: 'application-1',
        authorId: 'admin-1',
        content: 'Second',
        createdAt: new Date('2026-05-13T08:00:00.000Z'),
        author: {
          id: 'admin-1',
          email: 'admin@example.com',
          firstName: 'Ada',
          lastName: 'Min',
        },
      },
    ]);

    const result = await service.listMentorshipNotes('application-1', {
      id: 'mentor-1',
      email: 'mentor@example.com',
      role: UserRole.MENTOR,
    } as never);

    expect(programAMentorshipRepository.listNotes).toHaveBeenCalledWith(
      'application-1',
    );
    expect(result.map((note) => note.id)).toEqual(['note-1', 'note-2']);
  });
});

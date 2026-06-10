jest.mock('./applications.repository', () => ({
  ApplicationsRepository: class ApplicationsRepository {},
}));

jest.mock('./documents/application-documents.repository', () => ({
  ApplicationDocumentsRepository: class ApplicationDocumentsRepository {},
}));

jest.mock('./evaluations/application-evaluations.repository', () => ({
  ApplicationEvaluationsRepository: class ApplicationEvaluationsRepository {},
}));

jest.mock('./rules/application-rules.service', () => ({
  ApplicationRulesService: class ApplicationRulesService {},
}));

jest.mock('./calls/calls.repository', () => ({
  CallsRepository: class CallsRepository {},
}));

jest.mock('../team/team.repository', () => ({
  TeamRepository: class TeamRepository {},
}));

jest.mock('../files/files.repository', () => ({
  FilesRepository: class FilesRepository {},
}));

jest.mock('./eligibility-signals/eligibility-signals.service', () => ({
  EligibilitySignalsService: class EligibilitySignalsService {},
}));

jest.mock('../infrastructure/queue', () => ({
  QueueService: class QueueService {},
  EMAIL_JOBS: {
    APPLICATION_SUBMITTED: 'application-submitted',
    APPLICATION_NEEDS_INFO_REQUESTED: 'application-needs-info-requested',
    APPLICATION_APPROVED: 'application-approved',
    APPLICATION_REJECTED: 'application-rejected',
    APPLICATION_MENTOR_ASSIGNED: 'application-mentor-assigned',
  },
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
  NeedsInfoItemStatus,
  ProgramAMilestoneStatus,
  ProgramType,
  UploadStatus,
  UserRole,
} from '../../generated/prisma/enums';
import { ApplicationsService } from './applications.service';
import { ApplicationAccessService } from './application-access.service';
import { ProgramAMentorshipService } from '../programs/program-a/program-a-mentorship.service';
import { ProgramAMilestonesService } from '../programs/program-a/program-a-milestones.service';
import { CallsService } from './calls/calls.service';
import { ApplicationDecision } from './dto/create-application-decision.dto';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let callsService: CallsService;
  let mentorshipService: ProgramAMentorshipService;
  let milestonesService: ProgramAMilestonesService;
  let applicationsRepository: {
    findActiveByTeamAndCall: jest.Mock;
    createDraft: jest.Mock;
    findByIdWithRelations: jest.Mock;
    findByIdForWorkflow: jest.Mock;
    submitDraft: jest.Mock;
    transaction: jest.Mock;
    assignMentor: jest.Mock;
    updateStatusIfCurrent: jest.Mock;
    updateDecisionIfCurrent: jest.Mock;
    listInternalProgramAApplications: jest.Mock;
    listMyMentoredProgramAApplications: jest.Mock;
  };
  let applicationDocumentsRepository: {
    deactivateActiveBySlot: jest.Mock;
    findLatestVersionNumberBySlot: jest.Mock;
    createVersioned: jest.Mock;
  };
  let applicationEvaluationsRepository: {
    createEvaluation: jest.Mock;
    listByApplication: jest.Mock;
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
  let filesService: {
    createDownloadUrlForFile: jest.Mock;
  };
  let programAMentorshipRepository: {
    createNote: jest.Mock;
    listNotes: jest.Mock;
  };
  let programAMilestonesRepository: {
    createMilestone: jest.Mock;
    listByApplication: jest.Mock;
    findByIdForApplication: jest.Mock;
    updateMilestone: jest.Mock;
  };
  let userRepository: {
    findUnique: jest.Mock;
  };
  let needsInfoRepository: {
    createItem: jest.Mock;
    findItemForApplication: jest.Mock;
    createReply: jest.Mock;
    markItemAnswered: jest.Mock;
    findUnresolvedItems: jest.Mock;
    resolveAnsweredItems: jest.Mock;
    getThread: jest.Mock;
    getStatusEvents: jest.Mock;
    createStatusEvent: jest.Mock;
  };
  let eligibilitySignalsService: {
    recomputeForApplication: jest.Mock;
    getSignalsForApplication: jest.Mock;
  };
  let queueService: {
    addEmail: jest.Mock;
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
    members: [
      { userId: 'user-1', user: { email: 'lead@example.com' } },
      { userId: 'user-2', user: { email: 'member@example.com' } },
    ],
  };

  const completeProgramASections = [
    {
      key: 'idea_overview',
      activeVersion: 1,
    },
    {
      key: 'category_and_stack',
      activeVersion: 1,
    },
    {
      key: 'team_setup',
      activeVersion: 1,
    },
    {
      key: 'execution_plan',
      activeVersion: 1,
    },
    {
      key: 'business_case',
      activeVersion: 1,
    },
    {
      key: 'risks',
      activeVersion: 1,
    },
  ];

  const workflowApplication = {
    id: 'application-1',
    callId: 'call-1',
    teamId: 'team-1',
    createdById: 'user-1',
    status: ApplicationStatus.DRAFT,
    submittedAt: null,
    decidedAt: null,
    decisionById: null,
    decisionRationale: null,
    createdAt: new Date('2026-04-20T12:00:00.000Z'),
    updatedAt: new Date('2026-04-20T12:00:00.000Z'),
    call: mockCall,
    team: mockTeam,
    documents: [],
    sections: [],
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
    decisionById: null,
    decisionRationale: null,
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

  const completeEvaluation = {
    id: 'eval-1',
    applicationId: 'application-1',
    evaluatorId: 'evaluator-1',
    recommendation: 'APPROVE',
    comment: 'Looks good',
    createdAt: new Date('2026-05-10T10:00:00.000Z'),
    updatedAt: new Date('2026-05-10T10:00:00.000Z'),
    scores: [
      {
        id: 'score-1',
        evaluationId: 'eval-1',
        criterionCode: 'TECHNICAL_QUALITY',
        score: { toString: () => '4' },
        comment: null,
      },
      {
        id: 'score-2',
        evaluationId: 'eval-1',
        criterionCode: 'BUSINESS_VALUE',
        score: { toString: () => '5' },
        comment: null,
      },
      {
        id: 'score-3',
        evaluationId: 'eval-1',
        criterionCode: 'TEAM_CAPABILITY',
        score: { toString: () => '4' },
        comment: null,
      },
    ],
  };

  const validEvaluationScores = [
    { criterionCode: 'TECHNICAL_QUALITY', score: 4 },
    { criterionCode: 'BUSINESS_VALUE', score: 5 },
    { criterionCode: 'TEAM_CAPABILITY', score: 4 },
  ];

  beforeEach(() => {
    applicationsRepository = {
      findActiveByTeamAndCall: jest.fn(),
      createDraft: jest.fn(),
      findByIdWithRelations: jest.fn(),
      findByIdForWorkflow: jest.fn(),
      submitDraft: jest.fn(),
      assignMentor: jest.fn(),
      updateStatusIfCurrent: jest.fn(),
      updateDecisionIfCurrent: jest.fn(),
      listInternalProgramAApplications: jest.fn(),
      listMyMentoredProgramAApplications: jest.fn(),
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

    applicationEvaluationsRepository = {
      createEvaluation: jest.fn(),
      listByApplication: jest.fn(),
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

    filesService = {
      createDownloadUrlForFile: jest.fn(),
    };

    programAMentorshipRepository = {
      createNote: jest.fn(),
      listNotes: jest.fn(),
    };

    programAMilestonesRepository = {
      createMilestone: jest.fn(),
      listByApplication: jest.fn(),
      findByIdForApplication: jest.fn(),
      updateMilestone: jest.fn(),
    };

    userRepository = {
      findUnique: jest.fn(),
    };

    eligibilitySignalsService = {
      recomputeForApplication: jest.fn().mockResolvedValue(undefined),
      getSignalsForApplication: jest.fn().mockResolvedValue([]),
    };

    needsInfoRepository = {
      createItem: jest.fn(),
      findItemForApplication: jest.fn(),
      createReply: jest.fn(),
      markItemAnswered: jest.fn(),
      findUnresolvedItems: jest.fn(),
      resolveAnsweredItems: jest.fn(),
      getThread: jest.fn(),
      getStatusEvents: jest.fn(),
      createStatusEvent: jest.fn(),
    };

    queueService = {
      addEmail: jest.fn().mockResolvedValue(undefined),
    };

    const applicationAccess = new ApplicationAccessService(
      applicationRulesService as never,
    );
    service = new ApplicationsService(
      applicationsRepository as never,
      applicationEvaluationsRepository as never,
      applicationDocumentsRepository as never,
      applicationRulesService as never,
      teamRepository as never,
      filesRepository as never,
      filesService as never,
      needsInfoRepository as never,
      eligibilitySignalsService as never,
      queueService as never,
      applicationAccess,
    );
    callsService = new CallsService(callsRepository as never);
    mentorshipService = new ProgramAMentorshipService(
      applicationsRepository as never,
      programAMentorshipRepository as never,
      userRepository as never,
      queueService as never,
      applicationAccess,
    );
    milestonesService = new ProgramAMilestonesService(
      applicationsRepository as never,
      programAMilestonesRepository as never,
      applicationAccess,
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

    const result = await callsService.getRequiredDocumentsForCall('call-1');

    expect(result.requiredDocuments).toHaveLength(3);
    expect(result.programType).toBe(ProgramType.PROGRAM_A);
  });

  it('throws not found when required-document call does not exist', async () => {
    callsRepository.findByIdWithRequiredDocumentTypes.mockResolvedValue(null);

    await expect(
      callsService.getRequiredDocumentsForCall('missing-call'),
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

  it('allows assigned mentor to view any assigned application', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      mentorUserId: 'mentor-1',
    });

    const result = await service.findById('application-1', {
      id: 'mentor-1',
      email: 'mentor@example.com',
      role: UserRole.MENTOR,
    } as never);

    expect(result.id).toBe('application-1');
  });

  it('forbids unrelated mentor from viewing application', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      mentorUserId: 'mentor-1',
    });

    await expect(
      service.findById('application-1', {
        id: 'mentor-2',
        email: 'other-mentor@example.com',
        role: UserRole.MENTOR,
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
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

  it('returns eligibility signals for evaluator', async () => {
    const signals = [
      {
        code: 'TEAM_SIZE_MIN',
        passed: true,
        reason: null,
        createdAt: new Date('2026-05-02T11:00:00.000Z'),
      },
    ];

    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      detailApplication,
    );
    eligibilitySignalsService.getSignalsForApplication.mockResolvedValue(
      signals,
    );

    const result = await service.getEligibilitySignals('application-1', {
      id: 'evaluator-1',
      email: 'evaluator@example.com',
      role: UserRole.EVALUATOR,
    } as never);

    expect(
      eligibilitySignalsService.recomputeForApplication,
    ).toHaveBeenCalledWith('application-1');
    expect(result.applicationId).toBe('application-1');
    expect(result.signals).toBe(signals);
  });

  it('forbids outsider from viewing eligibility signals', async () => {
    applicationsRepository.findByIdWithRelations.mockResolvedValue(
      detailApplication,
    );

    await expect(
      service.getEligibilitySignals('application-1', {
        id: 'outsider-1',
        email: 'outsider@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids assigned mentor from viewing document completeness', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      mentorUserId: 'mentor-1',
    });

    await expect(
      service.getDocumentCompleteness('application-1', {
        id: 'mentor-1',
        email: 'mentor@example.com',
        role: UserRole.MENTOR,
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('internal Program A application list', () => {
    it('lists internal Program A applications for reviewer-side user', async () => {
      applicationsRepository.listInternalProgramAApplications.mockResolvedValue(
        [
          {
            id: 'application-1',
            status: ApplicationStatus.SUBMITTED,
            submittedAt: new Date('2026-05-01T10:00:00.000Z'),
            decidedAt: null,
            mentorUserId: 'mentor-1',
            mentorAssignedAt: new Date('2026-05-02T10:00:00.000Z'),
            mentorAssignedById: 'admin-1',
            createdAt: new Date('2026-04-30T10:00:00.000Z'),
            updatedAt: new Date('2026-05-02T10:00:00.000Z'),
            team: {
              id: 'team-1',
              name: 'Test Team',
              leaderId: 'user-1',
            },
            call: {
              id: 'call-1',
              title: 'Program A Call',
              type: ProgramType.PROGRAM_A,
              status: CallStatus.OPEN,
              opensAt: null,
              closesAt: null,
            },
            eligibilitySignals: [
              {
                id: 'signal-1',
                code: 'TEAM_SIZE_MIN',
                passed: true,
                reason: null,
              },
              {
                id: 'signal-2',
                code: 'ACADEMIC_EVIDENCE_REQUIRED',
                passed: false,
                reason: 'Missing academic evidence',
              },
            ],
            _count: {
              evaluations: 2,
            },
            evaluations: [{ id: 'evaluation-1' }],
          },
        ],
      );

      const result = await service.listInternalProgramAApplications({
        id: 'evaluator-1',
        email: 'evaluator@example.com',
        role: UserRole.EVALUATOR,
      } as never);

      expect(
        applicationsRepository.listInternalProgramAApplications,
      ).toHaveBeenCalledTimes(1);
      expect(
        applicationsRepository.listInternalProgramAApplications,
      ).toHaveBeenCalledWith('evaluator-1');

      expect(result).toEqual([
        {
          id: 'application-1',
          status: ApplicationStatus.SUBMITTED,
          submittedAt: new Date('2026-05-01T10:00:00.000Z'),
          decidedAt: null,
          team: {
            id: 'team-1',
            name: 'Test Team',
            leaderId: 'user-1',
          },
          call: {
            id: 'call-1',
            title: 'Program A Call',
            type: ProgramType.PROGRAM_A,
            status: CallStatus.OPEN,
            opensAt: null,
            closesAt: null,
          },
          mentorAssignment: {
            mentorUserId: 'mentor-1',
            mentorAssignedAt: new Date('2026-05-02T10:00:00.000Z'),
            mentorAssignedById: 'admin-1',
          },
          eligibilitySignalSummary: {
            total: 2,
            passed: 1,
            failed: 1,
          },
          evaluationSummary: {
            total: 2,
            evaluatedByCurrentUser: true,
          },
          createdAt: new Date('2026-04-30T10:00:00.000Z'),
          updatedAt: new Date('2026-05-02T10:00:00.000Z'),
        },
      ]);
    });

    it('forbids student from listing internal Program A applications', async () => {
      await expect(
        service.listInternalProgramAApplications({
          id: 'user-1',
          email: 'lead@example.com',
          role: UserRole.STUDENT,
        } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        applicationsRepository.listInternalProgramAApplications,
      ).not.toHaveBeenCalled();
    });
  });

  describe('mentor-scoped Program A application list', () => {
    it('lists assigned Program A applications for the current mentor', async () => {
      applicationsRepository.listMyMentoredProgramAApplications.mockResolvedValue(
        [
          {
            id: 'application-1',
            status: ApplicationStatus.ACTIVE_PROJECT,
            callId: 'call-1',
            teamId: 'team-1',
            mentorUserId: 'mentor-1',
            mentorAssignedAt: new Date('2026-05-02T10:00:00.000Z'),
            createdAt: new Date('2026-04-30T10:00:00.000Z'),
            updatedAt: new Date('2026-05-03T10:00:00.000Z'),
            call: {
              id: 'call-1',
              title: 'Program A Call',
            },
            team: {
              id: 'team-1',
              name: 'Alpha Team',
              members: [
                {
                  userId: 'student-1',
                  user: {
                    id: 'student-1',
                    firstName: 'Ava',
                    lastName: 'Stone',
                    email: 'ava@example.com',
                  },
                },
                {
                  userId: 'student-2',
                  user: {
                    id: 'student-2',
                    firstName: 'Ben',
                    lastName: 'Lake',
                    email: 'ben@example.com',
                  },
                },
              ],
            },
          },
        ],
      );

      const result = await service.listMyMentoredProgramAApplications({
        id: 'mentor-1',
        email: 'mentor@example.com',
        role: UserRole.MENTOR,
      } as never);

      expect(
        applicationsRepository.listMyMentoredProgramAApplications,
      ).toHaveBeenCalledWith('mentor-1');
      expect(result).toEqual([
        {
          id: 'application-1',
          status: ApplicationStatus.ACTIVE_PROJECT,
          teamId: 'team-1',
          teamName: 'Alpha Team',
          teamMembers: [
            {
              id: 'student-1',
              firstName: 'Ava',
              lastName: 'Stone',
              email: 'ava@example.com',
            },
            {
              id: 'student-2',
              firstName: 'Ben',
              lastName: 'Lake',
              email: 'ben@example.com',
            },
          ],
          callId: 'call-1',
          callTitle: 'Program A Call',
          mentorUserId: 'mentor-1',
          assignedAt: new Date('2026-05-02T10:00:00.000Z'),
          createdAt: new Date('2026-04-30T10:00:00.000Z'),
          updatedAt: new Date('2026-05-03T10:00:00.000Z'),
        },
      ]);
    });

    it('returns empty array when mentor has no assigned Program A applications', async () => {
      applicationsRepository.listMyMentoredProgramAApplications.mockResolvedValue(
        [],
      );

      const result = await service.listMyMentoredProgramAApplications({
        id: 'mentor-1',
        email: 'mentor@example.com',
        role: UserRole.MENTOR,
      } as never);

      expect(result).toEqual([]);
    });

    it('forbids non-mentor users from mentor-scoped Program A list', async () => {
      await expect(
        service.listMyMentoredProgramAApplications({
          id: 'admin-1',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        applicationsRepository.listMyMentoredProgramAApplications,
      ).not.toHaveBeenCalled();
    });
  });

  it('submits a complete draft application and locks the team', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      sections: completeProgramASections,
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
    expect(
      eligibilitySignalsService.recomputeForApplication,
    ).toHaveBeenCalledWith('application-1', { tx: 'db-client' });
    expect(needsInfoRepository.createStatusEvent).toHaveBeenCalledWith(
      {
        applicationId: 'application-1',
        fromStatus: ApplicationStatus.DRAFT,
        toStatus: ApplicationStatus.SUBMITTED,
        changedById: 'user-1',
      },
      { tx: 'db-client' },
    );
    expect(queueService.addEmail).toHaveBeenCalledWith(
      'application-submitted',
      expect.objectContaining({
        email: 'lead@example.com',
        applicationId: 'application-1',
      }),
    );
    expect(teamRepository.update).toHaveBeenCalled();
    expect(result.status).toBe(ApplicationStatus.SUBMITTED);
  });

  it('rejects submit when Program A application is missing required sections', async () => {
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

  it('rejects submit when Program A application is missing required documents', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      sections: completeProgramASections,
      documents: [],
    });

    await expect(
      service.submit('application-1', {
        id: 'user-1',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(applicationsRepository.submitDraft).not.toHaveBeenCalled();
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
        requiredDocumentTypes: [],
        eligibilityRuleConfigs: [],
        programACategories: [],
        programAStackTags: [],
      },
    ]);
    callsRepository.countPublic.mockResolvedValue(1);

    const result = await callsService.listPublicCalls({
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

    await callsService.listActivePublicCalls({
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
      requiredDocumentTypes: [],
      eligibilityRuleConfigs: [],
      programACategories: [],
      programAStackTags: [],
    });
    const result = await callsService.findPublicCallById('call-1');

    expect(callsRepository.findPublicById).toHaveBeenCalledWith('call-1');
    expect(result.type).toBe(ProgramType.PROGRAM_B);
  });

  it('returns Program A public call metadata', async () => {
    callsRepository.findPublicById.mockResolvedValue({
      id: 'call-1',
      title: 'Program A Call',
      type: ProgramType.PROGRAM_A,
      status: CallStatus.OPEN,
      opensAt: null,
      closesAt: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      requiredDocumentTypes: [
        {
          id: 'req-1',
          documentType: DocumentType.BUDGET,
          isRequired: true,
        },
      ],
      eligibilityRuleConfigs: [
        {
          code: 'TEAM_SIZE_MIN',
          threshold: '3',
        },
        {
          code: 'TRANSFERRED_SUBJECTS_MAX',
          threshold: '0',
        },
        {
          code: 'PROFILE_SUBJECTS_AVERAGE_MAX',
          threshold: '2',
        },
      ],
      programACategories: [
        {
          value: 'ai_data',
          label: 'AI & Data',
        },
      ],
      programAStackTags: [
        {
          value: 'nestjs',
          label: 'NestJS',
        },
      ],
    });

    const result = await callsService.findPublicCallById('call-1');

    expect(result.requiredDocumentTypes).toEqual([
      {
        id: 'req-1',
        documentType: DocumentType.BUDGET,
        isRequired: true,
      },
    ]);
    expect(result.minTeamSize).toBe(3);
    expect(result.maxTransferredSubjects).toBe(0);
    expect(result.maxProfileSubjectsAverage).toBe(2);
    expect(result.categories).toEqual([
      {
        value: 'ai_data',
        label: 'AI & Data',
      },
    ]);
    expect(result.stackTags).toEqual([
      {
        value: 'nestjs',
        label: 'NestJS',
      },
    ]);
  });

  it('throws not found when public call cannot be exposed', async () => {
    callsRepository.findPublicById.mockResolvedValue(null);

    await expect(
      callsService.findPublicCallById('call-404'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows admin to assign mentor on approved Program A application', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
    });
    userRepository.findUnique.mockResolvedValue({
      id: 'mentor-1',
      role: UserRole.MENTOR,
      email: 'mentor@example.com',
    });
    applicationsRepository.assignMentor.mockResolvedValue({
      id: 'application-1',
      mentorUserId: 'mentor-1',
      mentorAssignedAt: new Date('2026-05-13T10:00:00.000Z'),
      mentorAssignedById: 'admin-1',
    });

    const result = await mentorshipService.assignMentor(
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
    expect(queueService.addEmail).toHaveBeenCalledWith(
      'application-mentor-assigned',
      expect.objectContaining({
        email: 'mentor@example.com',
        applicationId: 'application-1',
      }),
    );
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
      mentorshipService.assignMentor(
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
      mentorshipService.assignMentor(
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
      mentorshipService.assignMentor(
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
      mentorshipService.assignMentor(
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
      email: 'mentor-new@example.com',
    });
    applicationsRepository.assignMentor.mockResolvedValue({
      id: 'application-1',
      mentorUserId: 'mentor-new',
      mentorAssignedAt: new Date('2026-05-13T11:00:00.000Z'),
      mentorAssignedById: 'admin-1',
    });

    const result = await mentorshipService.assignMentor(
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

    const result = await mentorshipService.createMentorshipNote(
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
      firstName: 'Mina',
      lastName: 'Tor',
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

    const result = await mentorshipService.createMentorshipNote(
      'application-1',
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as never,
      { content: 'Admin follow-up' },
    );

    expect(result.author.firstName).toBe('Ada');
    expect(result.author.lastName).toBe('Min');
  });

  it('forbids unassigned mentor from creating mentorship note', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
      mentorUserId: 'mentor-1',
    });

    await expect(
      mentorshipService.createMentorshipNote(
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
      mentorshipService.createMentorshipNote(
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

  it('rejects mentorship note creation for archived application when user is not admin', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.ARCHIVED,
      mentorUserId: 'mentor-1',
    });

    await expect(
      mentorshipService.createMentorshipNote(
        'application-1',
        {
          id: 'mentor-1',
          email: 'mentor@example.com',
          role: UserRole.MENTOR,
        } as never,
        { content: 'Trying to update archived application' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects mentorship note creation when no mentor is assigned', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
      mentorUserId: null,
    });

    await expect(
      mentorshipService.createMentorshipNote(
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

    const result = await mentorshipService.listMentorshipNotes(
      'application-1',
      {
        id: 'mentor-1',
        email: 'mentor@example.com',
        role: UserRole.MENTOR,
      } as never,
    );

    expect(programAMentorshipRepository.listNotes).toHaveBeenCalledWith(
      'application-1',
    );
    expect(result.map((note) => note.id)).toEqual(['note-1', 'note-2']);
  });

  it('allows team member to list mentorship notes for their application', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.ACTIVE_PROJECT,
      mentorUserId: 'mentor-1',
    });
    programAMentorshipRepository.listNotes.mockResolvedValue([
      {
        id: 'note-1',
        applicationId: 'application-1',
        authorId: 'mentor-1',
        content: 'Shared update',
        createdAt: new Date('2026-05-13T08:00:00.000Z'),
        author: {
          id: 'mentor-1',
          email: 'mentor@example.com',
          firstName: 'Mina',
          lastName: 'Tor',
        },
      },
    ]);

    const result = await mentorshipService.listMentorshipNotes(
      'application-1',
      {
        id: 'user-2',
        email: 'member@example.com',
        role: UserRole.STUDENT,
      } as never,
    );

    expect(programAMentorshipRepository.listNotes).toHaveBeenCalledWith(
      'application-1',
    );
    expect(result.map((note) => note.id)).toEqual(['note-1']);
  });

  describe('Program A milestones', () => {
    const approvedProgramAApplication = {
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
      mentorUserId: 'mentor-1',
    };

    const milestone = {
      id: 'milestone-1',
      applicationId: 'application-1',
      title: 'Build MVP prototype',
      description: 'Prepare a working MVP version for internal demo.',
      dueAt: new Date('2026-06-30T23:59:59.000Z'),
      status: ProgramAMilestoneStatus.PLANNED,
      progressNote: 'Initial planning completed.',
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-01T10:00:00.000Z'),
    };

    it('allows admin to create Program A milestone for approved application', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue(
        approvedProgramAApplication,
      );
      programAMilestonesRepository.createMilestone.mockResolvedValue(milestone);

      const result = await milestonesService.createProgramAMilestone(
        'application-1',
        {
          id: 'admin-1',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        } as never,
        {
          title: 'Build MVP prototype',
          description: 'Prepare a working MVP version for internal demo.',
          dueAt: '2026-06-30T23:59:59.000Z',
          status: ProgramAMilestoneStatus.PLANNED,
          progressNote: 'Initial planning completed.',
        },
      );

      expect(programAMilestonesRepository.createMilestone).toHaveBeenCalledWith(
        {
          applicationId: 'application-1',
          title: 'Build MVP prototype',
          description: 'Prepare a working MVP version for internal demo.',
          dueAt: new Date('2026-06-30T23:59:59.000Z'),
          status: ProgramAMilestoneStatus.PLANNED,
          progressNote: 'Initial planning completed.',
        },
        { tx: 'db-client' },
      );
      expect(result.id).toBe('milestone-1');
      expect(result.status).toBe(ProgramAMilestoneStatus.PLANNED);
    });

    it('allows assigned mentor to create Program A milestone', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue(
        approvedProgramAApplication,
      );
      programAMilestonesRepository.createMilestone.mockResolvedValue(milestone);

      const result = await milestonesService.createProgramAMilestone(
        'application-1',
        {
          id: 'mentor-1',
          email: 'mentor@example.com',
          role: UserRole.MENTOR,
        } as never,
        {
          title: 'Build MVP prototype',
        },
      );

      expect(result.id).toBe('milestone-1');
      expect(programAMilestonesRepository.createMilestone).toHaveBeenCalled();
    });

    it('rejects whitespace-only milestone title on create', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue(
        approvedProgramAApplication,
      );

      await expect(
        milestonesService.createProgramAMilestone(
          'application-1',
          {
            id: 'admin-1',
            email: 'admin@example.com',
            role: UserRole.ADMIN,
          } as never,
          {
            title: '   ',
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        programAMilestonesRepository.createMilestone,
      ).not.toHaveBeenCalled();
    });

    it('forbids student from creating Program A milestone', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue(
        approvedProgramAApplication,
      );

      await expect(
        milestonesService.createProgramAMilestone(
          'application-1',
          {
            id: 'user-1',
            email: 'lead@example.com',
            role: UserRole.STUDENT,
          } as never,
          {
            title: 'Build MVP prototype',
          },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects milestone creation before application is approved', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue({
        ...workflowApplication,
        status: ApplicationStatus.EVALUATING,
        mentorUserId: 'mentor-1',
      });

      await expect(
        milestonesService.createProgramAMilestone(
          'application-1',
          {
            id: 'admin-1',
            email: 'admin@example.com',
            role: UserRole.ADMIN,
          } as never,
          {
            title: 'Build MVP prototype',
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lists Program A milestones for reviewer-side user', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue(
        approvedProgramAApplication,
      );
      programAMilestonesRepository.listByApplication.mockResolvedValue([
        milestone,
      ]);

      const result = await milestonesService.listProgramAMilestones(
        'application-1',
        {
          id: 'evaluator-1',
          email: 'evaluator@example.com',
          role: UserRole.EVALUATOR,
        } as never,
      );

      expect(
        programAMilestonesRepository.listByApplication,
      ).toHaveBeenCalledWith('application-1');
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('milestone-1');
    });

    it('updates Program A milestone', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue(
        approvedProgramAApplication,
      );
      programAMilestonesRepository.findByIdForApplication.mockResolvedValue(
        milestone,
      );
      programAMilestonesRepository.updateMilestone.mockResolvedValue({
        ...milestone,
        status: ProgramAMilestoneStatus.IN_PROGRESS,
        progressNote: 'Backend integration started.',
      });

      const result = await milestonesService.updateProgramAMilestone(
        'application-1',
        'milestone-1',
        {
          id: 'admin-1',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        } as never,
        {
          status: ProgramAMilestoneStatus.IN_PROGRESS,
          progressNote: 'Backend integration started.',
        },
      );

      expect(
        programAMilestonesRepository.findByIdForApplication,
      ).toHaveBeenCalledWith('application-1', 'milestone-1', {
        tx: 'db-client',
      });
      expect(programAMilestonesRepository.updateMilestone).toHaveBeenCalledWith(
        'milestone-1',
        {
          status: ProgramAMilestoneStatus.IN_PROGRESS,
          progressNote: 'Backend integration started.',
        },
        { tx: 'db-client' },
      );
      expect(result.status).toBe(ProgramAMilestoneStatus.IN_PROGRESS);
    });

    it('rejects whitespace-only milestone title on update', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue(
        approvedProgramAApplication,
      );
      programAMilestonesRepository.findByIdForApplication.mockResolvedValue(
        milestone,
      );

      await expect(
        milestonesService.updateProgramAMilestone(
          'application-1',
          'milestone-1',
          {
            id: 'admin-1',
            email: 'admin@example.com',
            role: UserRole.ADMIN,
          } as never,
          {
            title: '   ',
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        programAMilestonesRepository.updateMilestone,
      ).not.toHaveBeenCalled();
    });

    it('throws not found when updating missing Program A milestone', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue(
        approvedProgramAApplication,
      );
      programAMilestonesRepository.findByIdForApplication.mockResolvedValue(
        null,
      );

      await expect(
        milestonesService.updateProgramAMilestone(
          'application-1',
          'missing-milestone',
          {
            id: 'admin-1',
            email: 'admin@example.com',
            role: UserRole.ADMIN,
          } as never,
          {
            status: ProgramAMilestoneStatus.DONE,
          },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('starts onboarding for approved Program A application', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
    });
    applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
      count: 1,
    });
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      status: ApplicationStatus.ONBOARDING,
    });

    const result = await service.startOnboarding('application-1', {
      id: 'reviewer-1',
      email: 'reviewer@example.com',
      role: UserRole.EVALUATOR,
    } as never);

    expect(applicationsRepository.updateStatusIfCurrent).toHaveBeenCalledWith(
      'application-1',
      ApplicationStatus.APPROVED,
      ApplicationStatus.ONBOARDING,
      { tx: 'db-client' },
    );
    expect(needsInfoRepository.createStatusEvent).toHaveBeenCalledWith(
      {
        applicationId: 'application-1',
        fromStatus: ApplicationStatus.APPROVED,
        toStatus: ApplicationStatus.ONBOARDING,
        changedById: 'reviewer-1',
        reason: undefined,
      },
      { tx: 'db-client' },
    );
    expect(result.status).toBe(ApplicationStatus.ONBOARDING);
  });

  it('activates application from onboarding', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.ONBOARDING,
    });
    applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
      count: 1,
    });
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      status: ApplicationStatus.ACTIVE_PROJECT,
    });

    const result = await service.activate('application-1', {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    } as never);

    expect(result.status).toBe(ApplicationStatus.ACTIVE_PROJECT);
  });

  it('formally verifies submitted Program A application', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.SUBMITTED,
    });
    applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
      count: 1,
    });
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      status: ApplicationStatus.FORMALLY_VERIFIED,
    });

    const result = await service.formalVerify(
      'application-1',
      {
        id: 'reviewer-1',
        email: 'reviewer@example.com',
        role: UserRole.EVALUATOR,
      } as never,
      'Formal review complete',
    );

    expect(applicationsRepository.updateStatusIfCurrent).toHaveBeenCalledWith(
      'application-1',
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.FORMALLY_VERIFIED,
      { tx: 'db-client' },
      undefined,
    );
    expect(result.status).toBe(ApplicationStatus.FORMALLY_VERIFIED);
  });

  it('starts evaluation after formal verification', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.FORMALLY_VERIFIED,
    });
    applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
      count: 1,
    });
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      status: ApplicationStatus.EVALUATING,
    });

    const result = await service.startEvaluation(
      'application-1',
      {
        id: 'reviewer-1',
        email: 'reviewer@example.com',
        role: UserRole.EVALUATOR,
      } as never,
      'Evaluation started',
    );

    expect(result.status).toBe(ApplicationStatus.EVALUATING);
  });

  it('approves Program A application from evaluating and sends notification', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.EVALUATING,
    });
    applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
      count: 1,
    });
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      status: ApplicationStatus.APPROVED,
      decidedAt: new Date('2026-05-14T12:00:00.000Z'),
    });

    const result = await service.approve(
      'application-1',
      {
        id: 'reviewer-1',
        email: 'reviewer@example.com',
        role: UserRole.EVALUATOR,
      } as never,
      'Approved by the committee',
    );

    expect(applicationsRepository.updateStatusIfCurrent).toHaveBeenCalledWith(
      'application-1',
      ApplicationStatus.EVALUATING,
      ApplicationStatus.APPROVED,
      { tx: 'db-client' },
      expect.objectContaining({
        decidedAt: expect.any(Date) as unknown as Date,
      }),
    );
    expect(queueService.addEmail).toHaveBeenCalledWith(
      'application-approved',
      expect.objectContaining({
        email: 'lead@example.com',
        applicationId: 'application-1',
      }),
    );
    expect(result.status).toBe(ApplicationStatus.APPROVED);
  });

  it('rejects Program A application and requires reason', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.EVALUATING,
    });
    applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
      count: 1,
    });
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      status: ApplicationStatus.REJECTED,
      decidedAt: new Date('2026-05-14T12:30:00.000Z'),
    });

    const result = await service.reject(
      'application-1',
      {
        id: 'reviewer-1',
        email: 'reviewer@example.com',
        role: UserRole.EVALUATOR,
      } as never,
      'Eligibility expectations were not met',
    );

    expect(queueService.addEmail).toHaveBeenCalledWith(
      'application-rejected',
      expect.objectContaining({
        email: 'lead@example.com',
        reason: 'Eligibility expectations were not met',
      }),
    );
    expect(result.status).toBe(ApplicationStatus.REJECTED);
  });

  it('reactivates application from paused state', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.PAUSED,
    });
    applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
      count: 1,
    });
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      status: ApplicationStatus.ACTIVE_PROJECT,
    });

    const result = await service.activate('application-1', {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    } as never);

    expect(result.status).toBe(ApplicationStatus.ACTIVE_PROJECT);
  });

  it('pauses active application and persists reason', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.ACTIVE_PROJECT,
    });
    applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
      count: 1,
    });
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      status: ApplicationStatus.PAUSED,
    });

    const result = await service.pause(
      'application-1',
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as never,
      'Awaiting external approval',
    );

    expect(needsInfoRepository.createStatusEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Awaiting external approval',
        toStatus: ApplicationStatus.PAUSED,
      }),
      { tx: 'db-client' },
    );
    expect(result.status).toBe(ApplicationStatus.PAUSED);
  });

  it('completes active application', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.ACTIVE_PROJECT,
    });
    applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
      count: 1,
    });
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      status: ApplicationStatus.COMPLETED,
    });

    const result = await service.complete('application-1', {
      id: 'admin-1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    } as never);

    expect(result.status).toBe(ApplicationStatus.COMPLETED);
  });

  it('archives completed application and persists reason', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.COMPLETED,
    });
    applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
      count: 1,
    });
    applicationsRepository.findByIdWithRelations.mockResolvedValue({
      ...detailApplication,
      status: ApplicationStatus.ARCHIVED,
    });

    const result = await service.archive(
      'application-1',
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.SUPER_ADMIN,
      } as never,
      'Retention period elapsed',
    );

    expect(result.status).toBe(ApplicationStatus.ARCHIVED);
    expect(needsInfoRepository.createStatusEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'Retention period elapsed',
        toStatus: ApplicationStatus.ARCHIVED,
      }),
      { tx: 'db-client' },
    );
  });

  it('rejects lifecycle transition for non Program A application', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.APPROVED,
      call: {
        ...mockCall,
        type: ProgramType.PROGRAM_B,
      },
    });

    await expect(
      service.startOnboarding('application-1', {
        id: 'reviewer-1',
        email: 'reviewer@example.com',
        role: UserRole.EVALUATOR,
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects lifecycle transition from invalid current status', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.SUBMITTED,
    });

    await expect(
      service.startOnboarding('application-1', {
        id: 'reviewer-1',
        email: 'reviewer@example.com',
        role: UserRole.EVALUATOR,
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects pause without reason', async () => {
    await expect(
      service.pause(
        'application-1',
        {
          id: 'admin-1',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        } as never,
        '   ',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects application rejection without reason', async () => {
    await expect(
      service.reject(
        'application-1',
        {
          id: 'reviewer-1',
          email: 'reviewer@example.com',
          role: UserRole.EVALUATOR,
        } as never,
        '   ',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects archive without reason', async () => {
    await expect(
      service.archive(
        'application-1',
        {
          id: 'admin-1',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        } as never,
        '',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects lifecycle transition for team-side user', async () => {
    await expect(
      service.complete('application-1', {
        id: 'user-1',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects lifecycle transition when status changes concurrently', async () => {
    applicationsRepository.findByIdForWorkflow.mockResolvedValue({
      ...workflowApplication,
      status: ApplicationStatus.ACTIVE_PROJECT,
    });
    applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
      count: 0,
    });

    await expect(
      service.complete('application-1', {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe('application evaluations', () => {
    it('creates evaluation for evaluator-side user in FORMALLY_VERIFIED status', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue({
        ...workflowApplication,
        status: ApplicationStatus.FORMALLY_VERIFIED,
      });
      applicationEvaluationsRepository.createEvaluation.mockResolvedValue(
        completeEvaluation,
      );

      const result = await service.createEvaluation(
        'application-1',
        {
          id: 'evaluator-1',
          email: 'evaluator@example.com',
          role: UserRole.EVALUATOR,
        } as never,
        {
          recommendation: 'APPROVE' as never,
          comment: 'Looks good',
          scores: validEvaluationScores,
        },
      );

      expect(
        applicationEvaluationsRepository.createEvaluation,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 'application-1',
          evaluatorId: 'evaluator-1',
          scores: validEvaluationScores,
        }),
        { tx: 'db-client' },
      );
      expect(result.id).toBe('eval-1');
      expect(result.evaluatorId).toBe('evaluator-1');
      expect(result.scores).toHaveLength(3);
    });

    it('blocks evaluation for student', async () => {
      await expect(
        service.createEvaluation(
          'application-1',
          {
            id: 'user-1',
            email: 'lead@example.com',
            role: UserRole.STUDENT,
          } as never,
          {
            recommendation: 'APPROVE' as never,
            comment: 'Should not work',
            scores: validEvaluationScores,
          },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(
        applicationEvaluationsRepository.createEvaluation,
      ).not.toHaveBeenCalled();
    });

    it('blocks evaluation in DRAFT status', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue({
        ...workflowApplication,
        status: ApplicationStatus.DRAFT,
      });

      await expect(
        service.createEvaluation(
          'application-1',
          {
            id: 'evaluator-1',
            email: 'evaluator@example.com',
            role: UserRole.EVALUATOR,
          } as never,
          {
            recommendation: 'APPROVE' as never,
            comment: 'Too early',
            scores: validEvaluationScores,
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('blocks evaluation with missing criteria', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue({
        ...workflowApplication,
        status: ApplicationStatus.FORMALLY_VERIFIED,
      });

      await expect(
        service.createEvaluation(
          'application-1',
          {
            id: 'evaluator-1',
            email: 'evaluator@example.com',
            role: UserRole.EVALUATOR,
          } as never,
          {
            recommendation: 'APPROVE' as never,
            comment: 'Incomplete scores',
            scores: [{ criterionCode: 'TECHNICAL_QUALITY', score: 4 }],
          },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        applicationEvaluationsRepository.createEvaluation,
      ).not.toHaveBeenCalled();
    });

    it('blocks duplicate evaluation from same evaluator', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue({
        ...workflowApplication,
        status: ApplicationStatus.EVALUATING,
      });
      applicationEvaluationsRepository.createEvaluation.mockRejectedValue({
        code: 'P2002',
      });

      await expect(
        service.createEvaluation(
          'application-1',
          {
            id: 'evaluator-1',
            email: 'evaluator@example.com',
            role: UserRole.EVALUATOR,
          } as never,
          {
            recommendation: 'APPROVE' as never,
            comment: 'Duplicate',
            scores: validEvaluationScores,
          },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('application decisions', () => {
    it('approves application when complete evaluation exists', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue({
        ...workflowApplication,
        status: ApplicationStatus.EVALUATING,
        decidedAt: null,
      });
      applicationEvaluationsRepository.listByApplication.mockResolvedValue([
        completeEvaluation,
      ]);
      applicationsRepository.updateDecisionIfCurrent.mockResolvedValue({
        count: 1,
      });
      applicationsRepository.findByIdWithRelations.mockResolvedValue({
        ...detailApplication,
        status: ApplicationStatus.APPROVED,
        decidedAt: new Date('2026-05-15T10:00:00.000Z'),
        decisionById: 'evaluator-1',
        decisionRationale: 'Meets all criteria',
      });

      const result = await service.createDecision(
        'application-1',
        {
          id: 'evaluator-1',
          email: 'evaluator@example.com',
          role: UserRole.EVALUATOR,
        } as never,
        {
          decision: ApplicationDecision.APPROVED,
          rationale: 'Meets all criteria',
        },
      );

      expect(
        applicationsRepository.updateDecisionIfCurrent,
      ).toHaveBeenCalledWith(
        'application-1',
        ApplicationStatus.EVALUATING,
        ApplicationStatus.APPROVED,
        'evaluator-1',
        'Meets all criteria',
        expect.any(Date),
        { tx: 'db-client' },
      );
      expect(result.status).toBe(ApplicationStatus.APPROVED);
      expect(result.decisionRationale).toBe('Meets all criteria');
    });

    it('rejects application when complete evaluation exists', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue({
        ...workflowApplication,
        status: ApplicationStatus.EVALUATING,
        decidedAt: null,
      });
      applicationEvaluationsRepository.listByApplication.mockResolvedValue([
        completeEvaluation,
      ]);
      applicationsRepository.updateDecisionIfCurrent.mockResolvedValue({
        count: 1,
      });
      applicationsRepository.findByIdWithRelations.mockResolvedValue({
        ...detailApplication,
        status: ApplicationStatus.REJECTED,
        decidedAt: new Date('2026-05-15T10:30:00.000Z'),
        decisionById: 'evaluator-1',
        decisionRationale: 'Does not meet requirements',
      });

      const result = await service.createDecision(
        'application-1',
        {
          id: 'evaluator-1',
          email: 'evaluator@example.com',
          role: UserRole.EVALUATOR,
        } as never,
        {
          decision: ApplicationDecision.REJECTED,
          rationale: 'Does not meet requirements',
        },
      );

      expect(
        applicationsRepository.updateDecisionIfCurrent,
      ).toHaveBeenCalledWith(
        'application-1',
        ApplicationStatus.EVALUATING,
        ApplicationStatus.REJECTED,
        'evaluator-1',
        'Does not meet requirements',
        expect.any(Date),
        { tx: 'db-client' },
      );
      expect(result.status).toBe(ApplicationStatus.REJECTED);
    });

    it('blocks decision without evaluations', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue({
        ...workflowApplication,
        status: ApplicationStatus.EVALUATING,
        decidedAt: null,
      });
      applicationEvaluationsRepository.listByApplication.mockResolvedValue([]);

      await expect(
        service.createDecision(
          'application-1',
          {
            id: 'evaluator-1',
            email: 'evaluator@example.com',
            role: UserRole.EVALUATOR,
          } as never,
          { decision: ApplicationDecision.APPROVED, rationale: 'Looks good' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        applicationsRepository.updateDecisionIfCurrent,
      ).not.toHaveBeenCalled();
    });

    it('blocks second decision', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue({
        ...workflowApplication,
        status: ApplicationStatus.APPROVED,
        decidedAt: new Date('2026-05-14T09:00:00.000Z'),
      });

      await expect(
        service.createDecision(
          'application-1',
          {
            id: 'evaluator-1',
            email: 'evaluator@example.com',
            role: UserRole.EVALUATOR,
          } as never,
          {
            decision: ApplicationDecision.REJECTED,
            rationale: 'Changed my mind',
          },
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(
        applicationsRepository.updateDecisionIfCurrent,
      ).not.toHaveBeenCalled();
    });

    it('creates status event for decision', async () => {
      applicationsRepository.findByIdForWorkflow.mockResolvedValue({
        ...workflowApplication,
        status: ApplicationStatus.EVALUATING,
        decidedAt: null,
      });
      applicationEvaluationsRepository.listByApplication.mockResolvedValue([
        completeEvaluation,
      ]);
      applicationsRepository.updateDecisionIfCurrent.mockResolvedValue({
        count: 1,
      });
      applicationsRepository.findByIdWithRelations.mockResolvedValue({
        ...detailApplication,
        status: ApplicationStatus.APPROVED,
        decidedAt: new Date('2026-05-15T11:00:00.000Z'),
        decisionById: 'evaluator-1',
        decisionRationale: 'All good',
      });

      await service.createDecision(
        'application-1',
        {
          id: 'evaluator-1',
          email: 'evaluator@example.com',
          role: UserRole.EVALUATOR,
        } as never,
        { decision: ApplicationDecision.APPROVED, rationale: 'All good' },
      );

      expect(needsInfoRepository.createStatusEvent).toHaveBeenCalledWith(
        {
          applicationId: 'application-1',
          fromStatus: ApplicationStatus.EVALUATING,
          toStatus: ApplicationStatus.APPROVED,
          changedById: 'evaluator-1',
          reason: 'All good',
        },
        { tx: 'db-client' },
      );
    });

    it('returns decision metadata in application detail', async () => {
      const decidedAt = new Date('2026-05-15T12:00:00.000Z');

      applicationsRepository.findByIdForWorkflow.mockResolvedValue({
        ...workflowApplication,
        status: ApplicationStatus.FORMALLY_VERIFIED,
        decidedAt: null,
      });
      applicationEvaluationsRepository.listByApplication.mockResolvedValue([
        completeEvaluation,
      ]);
      applicationsRepository.updateDecisionIfCurrent.mockResolvedValue({
        count: 1,
      });
      applicationsRepository.findByIdWithRelations.mockResolvedValue({
        ...detailApplication,
        status: ApplicationStatus.REJECTED,
        decidedAt,
        decisionById: 'evaluator-1',
        decisionRationale: 'Insufficient team capability',
      });

      const result = await service.createDecision(
        'application-1',
        {
          id: 'evaluator-1',
          email: 'evaluator@example.com',
          role: UserRole.EVALUATOR,
        } as never,
        {
          decision: ApplicationDecision.REJECTED,
          rationale: 'Insufficient team capability',
        },
      );

      expect(result.decidedAt).toEqual(decidedAt);
      expect(result.decisionById).toBe('evaluator-1');
      expect(result.decisionRationale).toBe('Insufficient team capability');
    });
  });

  describe('needs-info workflow', () => {
    const reviewer = {
      id: 'evaluator-1',
      email: 'eval@example.com',
      role: UserRole.EVALUATOR,
      status: 'ACTIVE',
      organizationId: null,
    } as never;

    const teamLead = {
      id: 'user-1',
      email: 'lead@example.com',
      role: UserRole.STUDENT,
      status: 'ACTIVE',
      organizationId: null,
    } as never;

    const submittedApplication = {
      ...workflowApplication,
      status: ApplicationStatus.SUBMITTED,
    };

    const needsInfoApplication = {
      ...workflowApplication,
      status: ApplicationStatus.NEEDS_INFO,
    };

    const storedItem = {
      id: 'needs-info-1',
      applicationId: 'application-1',
      message: 'Please clarify your budget',
      dueAt: null,
      status: NeedsInfoItemStatus.OPEN,
      createdById: 'evaluator-1',
      resolvedAt: null,
      resolvedById: null,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
    };

    describe('createNeedsInfoItem', () => {
      it('rejects non-reviewer users', async () => {
        await expect(
          service.createNeedsInfoItem('application-1', teamLead, {
            message: 'clarify',
          }),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });

      it('rejects when the application status does not allow needs-info', async () => {
        applicationsRepository.findByIdForWorkflow.mockResolvedValue(
          needsInfoApplication,
        );

        await expect(
          service.createNeedsInfoItem('application-1', reviewer, {
            message: 'clarify',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('creates the item, transitions to NEEDS_INFO and notifies the team', async () => {
        applicationsRepository.findByIdForWorkflow.mockResolvedValue(
          submittedApplication,
        );
        needsInfoRepository.createItem.mockResolvedValue(storedItem);
        applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
          count: 1,
        });

        const result = await service.createNeedsInfoItem(
          'application-1',
          reviewer,
          { message: 'Please clarify your budget' },
        );

        expect(
          applicationsRepository.updateStatusIfCurrent,
        ).toHaveBeenCalledWith(
          'application-1',
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.NEEDS_INFO,
          { tx: 'db-client' },
        );
        expect(needsInfoRepository.createStatusEvent).toHaveBeenCalledTimes(1);
        expect(queueService.addEmail).toHaveBeenCalledWith(
          'application-needs-info-requested',
          expect.objectContaining({ applicationId: 'application-1' }),
        );
        expect(result.id).toBe('needs-info-1');
      });

      it('throws on concurrent status change', async () => {
        applicationsRepository.findByIdForWorkflow.mockResolvedValue(
          submittedApplication,
        );
        needsInfoRepository.createItem.mockResolvedValue(storedItem);
        applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
          count: 0,
        });

        await expect(
          service.createNeedsInfoItem('application-1', reviewer, {
            message: 'clarify',
          }),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });

    describe('replyToNeedsInfoItem', () => {
      it('rejects users who are not the team lead', async () => {
        applicationsRepository.findByIdForWorkflow.mockResolvedValue(
          needsInfoApplication,
        );

        await expect(
          service.replyToNeedsInfoItem(
            'application-1',
            'needs-info-1',
            reviewer,
            { message: 'here you go' },
          ),
        ).rejects.toBeInstanceOf(ForbiddenException);
      });

      it('rejects replies when not in NEEDS_INFO status', async () => {
        applicationsRepository.findByIdForWorkflow.mockResolvedValue(
          submittedApplication,
        );

        await expect(
          service.replyToNeedsInfoItem(
            'application-1',
            'needs-info-1',
            teamLead,
            { message: 'here you go' },
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('rejects replies to an already resolved item', async () => {
        applicationsRepository.findByIdForWorkflow.mockResolvedValue(
          needsInfoApplication,
        );
        needsInfoRepository.findItemForApplication.mockResolvedValue({
          ...storedItem,
          status: NeedsInfoItemStatus.RESOLVED,
        });

        await expect(
          service.replyToNeedsInfoItem(
            'application-1',
            'needs-info-1',
            teamLead,
            { message: 'here you go' },
          ),
        ).rejects.toBeInstanceOf(ConflictException);
      });

      it('creates a reply and marks an open item as answered', async () => {
        applicationsRepository.findByIdForWorkflow.mockResolvedValue(
          needsInfoApplication,
        );
        needsInfoRepository.findItemForApplication.mockResolvedValue(
          storedItem,
        );
        needsInfoRepository.createReply.mockResolvedValue({
          id: 'reply-1',
          needsInfoItemId: 'needs-info-1',
          message: 'here you go',
          createdById: 'user-1',
          createdAt: new Date('2026-05-02T10:00:00.000Z'),
        });

        const result = await service.replyToNeedsInfoItem(
          'application-1',
          'needs-info-1',
          teamLead,
          { message: 'here you go' },
        );

        expect(needsInfoRepository.markItemAnswered).toHaveBeenCalledWith(
          'needs-info-1',
          { tx: 'db-client' },
        );
        expect(result.id).toBe('reply-1');
      });
    });

    describe('resubmit', () => {
      it('rejects resubmission when not in NEEDS_INFO status', async () => {
        applicationsRepository.findByIdForWorkflow.mockResolvedValue(
          submittedApplication,
        );

        await expect(
          service.resubmit('application-1', teamLead, {}),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('rejects resubmission while items are still open', async () => {
        applicationsRepository.findByIdForWorkflow.mockResolvedValue(
          needsInfoApplication,
        );
        needsInfoRepository.findUnresolvedItems.mockResolvedValue([
          { ...storedItem, status: NeedsInfoItemStatus.OPEN },
        ]);

        await expect(
          service.resubmit('application-1', teamLead, {}),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('resolves answered items and transitions back to EVALUATING', async () => {
        applicationsRepository.findByIdForWorkflow.mockResolvedValue(
          needsInfoApplication,
        );
        needsInfoRepository.findUnresolvedItems.mockResolvedValue([
          { ...storedItem, status: NeedsInfoItemStatus.ANSWERED },
        ]);
        applicationsRepository.updateStatusIfCurrent.mockResolvedValue({
          count: 1,
        });
        applicationsRepository.findByIdWithRelations.mockResolvedValue(
          detailApplication,
        );

        const result = await service.resubmit('application-1', teamLead, {});

        expect(needsInfoRepository.resolveAnsweredItems).toHaveBeenCalledTimes(
          1,
        );
        expect(
          applicationsRepository.updateStatusIfCurrent,
        ).toHaveBeenCalledWith(
          'application-1',
          ApplicationStatus.NEEDS_INFO,
          ApplicationStatus.EVALUATING,
          { tx: 'db-client' },
        );
        expect(result.id).toBe('application-1');
      });
    });

    describe('getNeedsInfoThread', () => {
      it('returns the mapped thread for an authorized reviewer', async () => {
        applicationsRepository.findByIdForWorkflow.mockResolvedValue(
          needsInfoApplication,
        );
        needsInfoRepository.getThread.mockResolvedValue([
          { ...storedItem, replies: [] },
        ]);
        needsInfoRepository.getStatusEvents.mockResolvedValue([]);

        const result = await service.getNeedsInfoThread(
          'application-1',
          reviewer,
        );

        expect(result.application.id).toBe('application-1');
        expect(result.items).toHaveLength(1);
        expect(result.items[0]!.id).toBe('needs-info-1');
      });
    });
  });
});

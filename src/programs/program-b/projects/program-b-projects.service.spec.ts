jest.mock('./program-b-projects.repository', () => ({
  ProgramBProjectsRepository: class ProgramBProjectsRepository {},
}));

jest.mock(
  'generated/prisma/client',
  () => ({
    Prisma: {
      TransactionIsolationLevel: {
        Serializable: 'Serializable',
      },
    },
  }),
  { virtual: true },
);

jest.mock('@prisma/client', () => ({}), { virtual: true });

jest.mock(
  'generated/prisma/enums',
  () => ({
    BacklogItemStatus: {
      ASSIGNED: 'ASSIGNED',
      IN_REALIZATION: 'IN_REALIZATION',
      CLOSED: 'CLOSED',
    },
    FileVisibility: {
      PRIVATE: 'PRIVATE',
    },
    ProgramBMilestoneStatus: {
      PLANNED: 'PLANNED',
      IN_PROGRESS: 'IN_PROGRESS',
      DONE: 'DONE',
      BLOCKED: 'BLOCKED',
    },
    ProgramBPoDecision: {
      APPROVED: 'APPROVED',
      CHANGES_REQUESTED: 'CHANGES_REQUESTED',
    },
    ProgramBProjectStatus: {
      ACTIVE: 'ACTIVE',
      BLOCKED: 'BLOCKED',
      COMPLETED: 'COMPLETED',
      CLOSED: 'CLOSED',
    },
    UserRole: {
      STUDENT: 'STUDENT',
      ADMIN: 'ADMIN',
      COMPANY_OWNER: 'COMPANY_OWNER',
      COMPANY_EMPLOYEE: 'COMPANY_EMPLOYEE',
      MENTOR: 'MENTOR',
      EVALUATOR: 'EVALUATOR',
      SUPER_ADMIN: 'SUPER_ADMIN',
    },
    UserStatus: {
      PENDING: 'PENDING',
      ACTIVE: 'ACTIVE',
      SUSPENDED: 'SUSPENDED',
    },
    UploadStatus: {
      PENDING: 'PENDING',
      UPLOADED: 'UPLOADED',
    },
  }),
  { virtual: true },
);

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  BacklogItemStatus,
  FileVisibility,
  ProgramBMilestoneStatus,
  ProgramBPoDecision,
  ProgramBProjectStatus,
  UploadStatus,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import { ProgramBFinalAcceptanceSide } from './dto/create-program-b-final-acceptance.dto';
import { ProgramBProjectsService } from './program-b-projects.service';

describe('ProgramBProjectsService', () => {
  let service: ProgramBProjectsService;

  let projectsRepository: {
    transaction: jest.Mock;
    findProjectForExecution: jest.Mock;
    findProjectDetail: jest.Mock;
    listProjectsForUser: jest.Mock;
    listMilestones: jest.Mock;
    createMilestone: jest.Mock;
    updateMilestoneForProject: jest.Mock;
    findMilestoneForProject: jest.Mock;
    listMentoringNotes: jest.Mock;
    createMentoringNote: jest.Mock;
    listPoReviews: jest.Mock;
    createPoReview: jest.Mock;
    listProjectDocuments: jest.Mock;
    findProjectDocumentById: jest.Mock;
    createProjectDocument: jest.Mock;
    updateProject: jest.Mock;
    updateBacklogStatusForProject: jest.Mock;
    acceptProjectByCompany: jest.Mock;
    acceptProjectByNti: jest.Mock;
  };

  let userRepository: {
    findActiveOrganizationMember: jest.Mock;
  };
  let filesService: {
    requestUpload: jest.Mock;
    completeUpload: jest.Mock;
  };
  let storageService: {
    createPresignedDownloadUrl: jest.Mock;
  };

  const companyUser = {
    id: 'company-user-1',
    email: 'company@example.com',
    role: UserRole.COMPANY_EMPLOYEE,
    status: UserStatus.ACTIVE,
    organizationId: 'org-1',
  } as const;

  const companyOwner = {
    id: 'company-owner-1',
    email: 'owner@example.com',
    role: UserRole.COMPANY_OWNER,
    status: UserStatus.ACTIVE,
    organizationId: 'org-1',
  } as const;

  const productOwner = {
    id: 'po-1',
    email: 'po@example.com',
    role: UserRole.COMPANY_EMPLOYEE,
    status: UserStatus.ACTIVE,
    organizationId: 'org-1',
  } as const;

  const admin = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    organizationId: null,
  } as const;

  const activeProject = {
    id: 'project-1',
    backlogItemId: 'backlog-1',
    applicationId: 'application-1',
    teamApplicationId: null,
    teamId: 'team-1',
    productOwnerUserId: 'po-1',
    mentorUserId: 'mentor-1',
    mentorAssignedAt: null,
    mentorAssignedById: null,
    status: ProgramBProjectStatus.ACTIVE,
    acceptedByCompanyAt: null,
    acceptedByNtiAt: null,
    createdAt: new Date('2026-05-17T10:00:00.000Z'),
    updatedAt: new Date('2026-05-17T10:00:00.000Z'),
    backlogItem: {
      id: 'backlog-1',
      organizationId: 'org-1',
      status: BacklogItemStatus.ASSIGNED,
    },
    application: {
      id: 'application-1',
      mentorUserId: 'mentor-1',
    },
    teamApplication: null,
  };

  const closedProject = {
    ...activeProject,
    status: ProgramBProjectStatus.CLOSED,
    acceptedByCompanyAt: new Date('2026-05-17T11:00:00.000Z'),
    acceptedByNtiAt: new Date('2026-05-17T12:00:00.000Z'),
  };

  beforeEach(() => {
    projectsRepository = {
      transaction: jest.fn((fn: (db: object) => Promise<unknown>) =>
        fn({ tx: 'db-client' }),
      ),
      findProjectForExecution: jest.fn().mockResolvedValue(activeProject),
      findProjectDetail: jest.fn().mockResolvedValue(activeProject),
      listProjectsForUser: jest.fn().mockResolvedValue([]),
      listMilestones: jest.fn().mockResolvedValue([]),
      createMilestone: jest.fn(),
      updateMilestoneForProject: jest.fn(),
      findMilestoneForProject: jest.fn(),
      listMentoringNotes: jest.fn().mockResolvedValue([]),
      createMentoringNote: jest.fn(),
      listPoReviews: jest.fn().mockResolvedValue([]),
      createPoReview: jest.fn(),
      listProjectDocuments: jest.fn().mockResolvedValue([]),
      findProjectDocumentById: jest.fn(),
      createProjectDocument: jest.fn(),
      updateProject: jest.fn(),
      updateBacklogStatusForProject: jest.fn(),
      acceptProjectByCompany: jest.fn(),
      acceptProjectByNti: jest.fn(),
    };

    userRepository = {
      findActiveOrganizationMember: jest.fn().mockResolvedValue({
        id: 'company-user-1',
      }),
    };

    filesService = {
      requestUpload: jest.fn(),
      completeUpload: jest.fn(),
    };

    storageService = {
      createPresignedDownloadUrl: jest.fn(),
    };

    service = new ProgramBProjectsService(
      projectsRepository as never,
      userRepository as never,
      filesService as never,
      storageService as never,
    );
  });

  it('creates a milestone for an active company-side organization member', async () => {
    const milestone = {
      id: 'milestone-1',
      projectId: 'project-1',
      title: 'Prototype',
      status: ProgramBMilestoneStatus.PLANNED,
    };

    projectsRepository.createMilestone.mockResolvedValue(milestone);

    const result = await service.createMilestone(
      'project-1',
      { title: 'Prototype' },
      companyUser as never,
    );

    expect(userRepository.findActiveOrganizationMember).toHaveBeenCalledWith(
      'org-1',
      'company-user-1',
      { tx: 'db-client' },
    );

    expect(projectsRepository.createMilestone).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        title: 'Prototype',
        status: ProgramBMilestoneStatus.PLANNED,
      }),
      { tx: 'db-client' },
    );

    expect(result).toBe(milestone);
  });

  it('allows company owners to manage milestones without team membership check', async () => {
    const milestone = {
      id: 'milestone-1',
      projectId: 'project-1',
      title: 'Prototype',
      status: ProgramBMilestoneStatus.PLANNED,
    };

    userRepository.findActiveOrganizationMember.mockResolvedValue({
      id: 'company-owner-1',
    });
    projectsRepository.createMilestone.mockResolvedValue(milestone);

    const result = await service.createMilestone(
      'project-1',
      { title: 'Prototype' },
      companyOwner as never,
    );

    expect(userRepository.findActiveOrganizationMember).toHaveBeenCalledWith(
      'org-1',
      'company-owner-1',
      { tx: 'db-client' },
    );

    expect(result).toBe(milestone);
  });

  it('maps milestone responses to the DTO shape', async () => {
    projectsRepository.listMilestones.mockResolvedValue([
      {
        id: 'milestone-1',
        projectId: 'project-1',
        title: 'Prototype',
        description: null,
        dueAt: null,
        status: ProgramBMilestoneStatus.PLANNED,
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
        updatedAt: new Date('2026-05-17T10:00:00.000Z'),
      },
    ]);

    await expect(
      service.listMilestones('project-1', admin as never),
    ).resolves.toEqual([
      {
        id: 'milestone-1',
        title: 'Prototype',
        description: undefined,
        dueAt: undefined,
        status: ProgramBMilestoneStatus.PLANNED,
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
        updatedAt: new Date('2026-05-17T10:00:00.000Z'),
      },
    ]);
  });

  it('creates a project document upload with the next category version', async () => {
    filesService.requestUpload.mockResolvedValue({
      fileId: 'file-1',
      uploadUrl: 'https://upload.example.com',
      expiresAt: new Date('2026-05-18T10:00:00.000Z'),
    });
    projectsRepository.listProjectDocuments.mockResolvedValue([
      { category: 'OUTPUT', version: 1 },
      { category: 'OUTPUT', version: 2 },
      { category: 'OTHER', version: 99 },
    ]);
    projectsRepository.createProjectDocument.mockResolvedValue({
      id: 'document-1',
    });

    const result = await service.createDocumentUpload(
      'project-1',
      {
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        category: 'OUTPUT' as never,
        visibility: 'PARTICIPANTS' as never,
      },
      companyUser as never,
    );

    expect(filesService.requestUpload).toHaveBeenCalledWith(
      companyUser,
      expect.objectContaining({
        visibility: FileVisibility.PRIVATE,
      }),
    );
    expect(projectsRepository.createProjectDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        uploadedFileId: 'file-1',
        category: 'OUTPUT',
        version: 3,
        createdById: companyUser.id,
      }),
      { tx: 'db-client' },
    );
    expect(result.documentId).toBe('document-1');
  });

  it('completes a project document upload and returns the mapped document', async () => {
    projectsRepository.findProjectDocumentById
      .mockResolvedValueOnce({
        id: 'document-1',
        projectId: 'project-1',
        category: 'OUTPUT',
        visibility: 'PARTICIPANTS',
        version: 1,
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
        uploadedFile: {
          id: 'file-1',
          originalName: 'report.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          status: UploadStatus.PENDING,
          uploadedAt: null,
        },
      })
      .mockResolvedValueOnce({
        id: 'document-1',
        projectId: 'project-1',
        category: 'OUTPUT',
        visibility: 'PARTICIPANTS',
        version: 1,
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
        uploadedFile: {
          id: 'file-1',
          originalName: 'report.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          status: UploadStatus.UPLOADED,
          uploadedAt: new Date('2026-05-17T10:10:00.000Z'),
        },
      });

    const result = await service.completeDocumentUpload(
      'project-1',
      'document-1',
      { size: 1024, checksum: 'abc123' },
      companyUser as never,
    );

    expect(filesService.completeUpload).toHaveBeenCalledWith(companyUser, {
      fileId: 'file-1',
      size: 1024,
      checksum: 'abc123',
    });
    expect(result.status).toBe(UploadStatus.UPLOADED);
  });

  it('rejects project document download before the upload is completed', async () => {
    projectsRepository.findProjectDocumentById.mockResolvedValue({
      id: 'document-1',
      projectId: 'project-1',
      category: 'OUTPUT',
      visibility: 'PARTICIPANTS',
      version: 1,
      createdAt: new Date('2026-05-17T10:00:00.000Z'),
      uploadedFile: {
        id: 'file-1',
        key: 'uploads/file-1',
        originalName: 'report.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        status: UploadStatus.PENDING,
        uploadedAt: null,
      },
    });

    await expect(
      service.requestDocumentDownload(
        'project-1',
        'document-1',
        companyUser as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects company employees who are not active organization members', async () => {
    userRepository.findActiveOrganizationMember.mockResolvedValue(null);

    await expect(
      service.createMilestone(
        'project-1',
        { title: 'Prototype' },
        companyUser as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(projectsRepository.createMilestone).not.toHaveBeenCalled();
  });

  it('updates a milestone through project-scoped conditional write', async () => {
    projectsRepository.updateMilestoneForProject.mockResolvedValue({
      count: 1,
    });

    projectsRepository.findMilestoneForProject.mockResolvedValue({
      id: 'milestone-1',
      projectId: 'project-1',
      title: 'Updated',
      status: ProgramBMilestoneStatus.IN_PROGRESS,
    });

    const result = await service.updateMilestone(
      'project-1',
      'milestone-1',
      {
        title: 'Updated',
        status: ProgramBMilestoneStatus.IN_PROGRESS,
      },
      companyUser as never,
    );

    expect(projectsRepository.updateMilestoneForProject).toHaveBeenCalledWith(
      'project-1',
      'milestone-1',
      {
        title: 'Updated',
        status: ProgramBMilestoneStatus.IN_PROGRESS,
      },
      { tx: 'db-client' },
    );

    expect(result.title).toBe('Updated');
  });

  it('rejects empty milestone update body', async () => {
    await expect(
      service.updateMilestone(
        'project-1',
        'milestone-1',
        {},
        companyUser as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(projectsRepository.findProjectForExecution).not.toHaveBeenCalled();
  });

  it('creates mentoring notes for the assigned mentor', async () => {
    const note = {
      id: 'note-1',
      projectId: 'project-1',
      authorUserId: 'mentor-1',
      note: 'Review deployment plan',
    };

    projectsRepository.createMentoringNote.mockResolvedValue(note);

    const result = await service.createMentoringNote(
      'project-1',
      { note: 'Review deployment plan' },
      {
        id: 'mentor-1',
        email: 'mentor@example.com',
        role: UserRole.MENTOR,
        status: UserStatus.ACTIVE,
        organizationId: null,
      } as never,
    );

    expect(projectsRepository.createMentoringNote).toHaveBeenCalledWith(
      {
        projectId: 'project-1',
        authorUserId: 'mentor-1',
        note: 'Review deployment plan',
      },
      { tx: 'db-client' },
    );

    expect(result).toBe(note);
  });

  it('creates mentoring notes for NTI-side reviewer roles', async () => {
    const note = {
      id: 'note-1',
      projectId: 'project-1',
      authorUserId: 'admin-1',
      note: 'Review deployment plan',
    };

    projectsRepository.createMentoringNote.mockResolvedValue(note);

    const result = await service.createMentoringNote(
      'project-1',
      { note: 'Review deployment plan' },
      admin as never,
    );

    expect(projectsRepository.createMentoringNote).toHaveBeenCalledWith(
      {
        projectId: 'project-1',
        authorUserId: 'admin-1',
        note: 'Review deployment plan',
      },
      { tx: 'db-client' },
    );

    expect(result).toBe(note);
  });

  it('rejects unassigned mentors from creating mentoring notes', async () => {
    await expect(
      service.createMentoringNote(
        'project-1',
        { note: 'Review deployment plan' },
        {
          id: 'mentor-2',
          email: 'mentor-2@example.com',
          role: UserRole.MENTOR,
          status: UserStatus.ACTIVE,
          organizationId: null,
        } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(projectsRepository.createMentoringNote).not.toHaveBeenCalled();
  });

  it('rejects inactive mentors from creating mentoring notes', async () => {
    await expect(
      service.createMentoringNote(
        'project-1',
        { note: 'Review deployment plan' },
        {
          id: 'mentor-1',
          email: 'mentor@example.com',
          role: UserRole.MENTOR,
          status: UserStatus.PENDING,
          organizationId: null,
        } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(projectsRepository.createMentoringNote).not.toHaveBeenCalled();
  });

  it('restricts PO reviews to the assigned product owner', async () => {
    await expect(
      service.createPoReview(
        'project-1',
        {
          decision: ProgramBPoDecision.APPROVED,
        },
        companyUser as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(projectsRepository.createPoReview).not.toHaveBeenCalled();
  });

  it('creates PO reviews for the assigned product owner', async () => {
    projectsRepository.createPoReview.mockResolvedValue({
      id: 'review-1',
      projectId: 'project-1',
      authorUserId: 'po-1',
      decision: ProgramBPoDecision.APPROVED,
    });

    const result = await service.createPoReview(
      'project-1',
      {
        decision: ProgramBPoDecision.APPROVED,
      },
      productOwner as never,
    );

    expect(projectsRepository.createPoReview).toHaveBeenCalledWith(
      {
        projectId: 'project-1',
        authorUserId: 'po-1',
        decision: ProgramBPoDecision.APPROVED,
        comment: undefined,
      },
      { tx: 'db-client' },
    );

    expect(result.id).toBe('review-1');
  });

  it('rejects inactive product owners from creating PO reviews', async () => {
    await expect(
      service.createPoReview(
        'project-1',
        {
          decision: ProgramBPoDecision.APPROVED,
        },
        {
          ...productOwner,
          status: UserStatus.PENDING,
        } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(projectsRepository.createPoReview).not.toHaveBeenCalled();
  });

  it('allows the assigned product owner to record company acceptance', async () => {
    projectsRepository.acceptProjectByCompany.mockResolvedValue({
      ...activeProject,
      acceptedByCompanyAt: new Date('2026-05-17T11:00:00.000Z'),
      status: ProgramBProjectStatus.ACTIVE,
    });

    const result = await service.recordFinalAcceptance(
      'project-1',
      { side: ProgramBFinalAcceptanceSide.COMPANY },
      productOwner as never,
    );

    expect(userRepository.findActiveOrganizationMember).not.toHaveBeenCalled();

    expect(projectsRepository.acceptProjectByCompany).toHaveBeenCalledWith(
      'project-1',
      expect.any(Date) as Date,
      false,
      { tx: 'db-client' },
    );

    expect(result.status).toBe(ProgramBProjectStatus.ACTIVE);
  });

  it('allows same-organization company owners to record company acceptance', async () => {
    userRepository.findActiveOrganizationMember.mockResolvedValue({
      id: 'company-owner-1',
    });

    projectsRepository.acceptProjectByCompany.mockResolvedValue({
      ...activeProject,
      acceptedByCompanyAt: new Date('2026-05-17T11:00:00.000Z'),
      status: ProgramBProjectStatus.ACTIVE,
    });

    const result = await service.recordFinalAcceptance(
      'project-1',
      { side: ProgramBFinalAcceptanceSide.COMPANY },
      companyOwner as never,
    );

    expect(userRepository.findActiveOrganizationMember).toHaveBeenCalledWith(
      'org-1',
      'company-owner-1',
      { tx: 'db-client' },
    );

    expect(projectsRepository.acceptProjectByCompany).toHaveBeenCalledWith(
      'project-1',
      expect.any(Date) as Date,
      false,
      { tx: 'db-client' },
    );

    expect(result.status).toBe(ProgramBProjectStatus.ACTIVE);
  });

  it('rejects non-owner company users from recording company acceptance', async () => {
    await expect(
      service.recordFinalAcceptance(
        'project-1',
        { side: ProgramBFinalAcceptanceSide.COMPANY },
        companyUser as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(projectsRepository.acceptProjectByCompany).not.toHaveBeenCalled();
  });

  it('keeps the project open after only one final acceptance', async () => {
    const companyAcceptedProject = {
      ...activeProject,
      acceptedByCompanyAt: new Date('2026-05-17T11:00:00.000Z'),
      status: ProgramBProjectStatus.ACTIVE,
    };

    projectsRepository.acceptProjectByCompany.mockResolvedValue(
      companyAcceptedProject,
    );
    projectsRepository.findProjectForExecution
      .mockResolvedValueOnce(activeProject)
      .mockResolvedValueOnce(companyAcceptedProject);
    projectsRepository.findProjectDetail.mockResolvedValue(
      companyAcceptedProject,
    );

    const result = await service.recordFinalAcceptance(
      'project-1',
      { side: ProgramBFinalAcceptanceSide.COMPANY },
      productOwner as never,
    );

    expect(projectsRepository.acceptProjectByCompany).toHaveBeenCalledWith(
      'project-1',
      expect.any(Date) as Date,
      false,
      { tx: 'db-client' },
    );

    expect(result.status).toBe(ProgramBProjectStatus.ACTIVE);
  });

  it('closes the project only after both final acceptances are present', async () => {
    const companyAcceptedProject = {
      ...activeProject,
      acceptedByCompanyAt: new Date('2026-05-17T11:00:00.000Z'),
    };

    const closedProjectDetail = {
      ...companyAcceptedProject,
      acceptedByNtiAt: new Date('2026-05-17T12:00:00.000Z'),
      status: ProgramBProjectStatus.CLOSED,
    };

    projectsRepository.findProjectForExecution.mockResolvedValue(
      companyAcceptedProject,
    );

    projectsRepository.acceptProjectByNti.mockResolvedValue(
      closedProjectDetail,
    );
    projectsRepository.findProjectDetail.mockResolvedValue(closedProjectDetail);

    const result = await service.recordFinalAcceptance(
      'project-1',
      { side: ProgramBFinalAcceptanceSide.NTI },
      admin as never,
    );

    expect(projectsRepository.acceptProjectByNti).toHaveBeenCalledWith(
      'project-1',
      expect.any(Date) as Date,
      true,
      { tx: 'db-client' },
    );

    expect(result.status).toBe(ProgramBProjectStatus.CLOSED);
  });

  it('keeps repeated final acceptance idempotent for the same side', async () => {
    const acceptedProject = {
      ...activeProject,
      acceptedByCompanyAt: new Date('2026-05-17T11:00:00.000Z'),
    };

    projectsRepository.findProjectForExecution.mockResolvedValue(
      acceptedProject,
    );
    projectsRepository.findProjectDetail.mockResolvedValue(acceptedProject);

    const result = await service.recordFinalAcceptance(
      'project-1',
      { side: ProgramBFinalAcceptanceSide.COMPANY },
      productOwner as never,
    );

    expect(projectsRepository.acceptProjectByCompany).not.toHaveBeenCalled();
    expect(projectsRepository.acceptProjectByNti).not.toHaveBeenCalled();
    expect(result.acceptedByCompanyAt).toEqual(
      acceptedProject.acceptedByCompanyAt,
    );
    expect(result.id).toBe(acceptedProject.id);
  });

  it('rejects non-idempotent final acceptance after closure', async () => {
    projectsRepository.findProjectForExecution.mockResolvedValue({
      ...activeProject,
      status: ProgramBProjectStatus.CLOSED,
      acceptedByCompanyAt: new Date('2026-05-17T11:00:00.000Z'),
      acceptedByNtiAt: null,
    });

    await expect(
      service.recordFinalAcceptance(
        'project-1',
        { side: ProgramBFinalAcceptanceSide.NTI },
        admin as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(projectsRepository.acceptProjectByNti).not.toHaveBeenCalled();
  });

  it('rejects milestone creation after closure', async () => {
    projectsRepository.findProjectForExecution.mockResolvedValue(closedProject);

    await expect(
      service.createMilestone(
        'project-1',
        { title: 'Late milestone' },
        companyUser as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(projectsRepository.createMilestone).not.toHaveBeenCalled();
  });

  it('rejects milestone updates after closure', async () => {
    projectsRepository.findProjectForExecution.mockResolvedValue(closedProject);

    await expect(
      service.updateMilestone(
        'project-1',
        'milestone-1',
        { title: 'Late update' },
        companyUser as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(projectsRepository.updateMilestoneForProject).not.toHaveBeenCalled();
  });

  it('rejects mentoring notes after closure', async () => {
    projectsRepository.findProjectForExecution.mockResolvedValue(closedProject);

    await expect(
      service.createMentoringNote('project-1', { note: 'Late note' }, {
        id: 'mentor-1',
        email: 'mentor@example.com',
        role: UserRole.MENTOR,
        status: UserStatus.ACTIVE,
        organizationId: null,
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(projectsRepository.createMentoringNote).not.toHaveBeenCalled();
  });

  it('rejects PO reviews after closure', async () => {
    projectsRepository.findProjectForExecution.mockResolvedValue(closedProject);

    await expect(
      service.createPoReview(
        'project-1',
        { decision: ProgramBPoDecision.APPROVED },
        productOwner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(projectsRepository.createPoReview).not.toHaveBeenCalled();
  });
});

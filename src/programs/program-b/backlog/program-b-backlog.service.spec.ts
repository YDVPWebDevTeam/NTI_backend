jest.mock('./program-b-backlog.repository', () => ({
  ProgramBBacklogRepository: class ProgramBBacklogRepository {},
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
      DRAFT: 'DRAFT',
      PUBLISHED: 'PUBLISHED',
      IN_PAIRING: 'IN_PAIRING',
      ARCHIVED: 'ARCHIVED',
    },
    FileVisibility: {
      PRIVATE: 'PRIVATE',
    },
    OrganizationStatus: {
      PENDING: 'PENDING',
      ACTIVE: 'ACTIVE',
      REJECTED: 'REJECTED',
      SUSPENDED: 'SUSPENDED',
    },
    UserStatus: {
      PENDING: 'PENDING',
      ACTIVE: 'ACTIVE',
      SUSPENDED: 'SUSPENDED',
    },
    ProgramBTeamApplicationStatus: {
      SUBMITTED: 'SUBMITTED',
      WITHDRAWN: 'WITHDRAWN',
      SHORTLISTED: 'SHORTLISTED',
      ACCEPTED: 'ACCEPTED',
      REJECTED: 'REJECTED',
      PROJECT_CREATED: 'PROJECT_CREATED',
    },
    UserRole: {
      STUDENT: 'STUDENT',
      COMPANY_OWNER: 'COMPANY_OWNER',
      COMPANY_EMPLOYEE: 'COMPANY_EMPLOYEE',
      EVALUATOR: 'EVALUATOR',
      ADMIN: 'ADMIN',
      SUPER_ADMIN: 'SUPER_ADMIN',
    },
    UploadStatus: {
      PENDING: 'PENDING',
      UPLOADED: 'UPLOADED',
    },
  }),
  { virtual: true },
);

jest.mock(
  '../../../organization/organization.repository',
  () => ({
    OrganizationRepository: class OrganizationRepository {},
  }),
  { virtual: true },
);

jest.mock(
  '../../../user/user.repository',
  () => ({
    UserRepository: class UserRepository {},
  }),
  { virtual: true },
);

jest.mock('../team-application/program-b-team-application.repository', () => ({
  ProgramBTeamApplicationRepository: class ProgramBTeamApplicationRepository {},
}));

jest.mock('../projects/program-b-projects.repository', () => ({
  ProgramBProjectsRepository: class ProgramBProjectsRepository {},
}));

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  BacklogItemStatus,
  FileVisibility,
  OrganizationStatus,
  ProgramBTeamApplicationStatus,
  UploadStatus,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import { ProgramBBacklogService } from './program-b-backlog.service';

describe('ProgramBBacklogService', () => {
  let service: ProgramBBacklogService;

  let backlogRepository: {
    create: jest.Mock;
    findUnique: jest.Mock<Promise<unknown>, unknown[]>;
    findDetailUnique: jest.Mock<Promise<unknown>, unknown[]>;
    update: jest.Mock;
    updateMany: jest.Mock;
    deleteDraftById: jest.Mock;
    findMany: jest.Mock<Promise<unknown>, unknown[]>;
    findDetails: jest.Mock<Promise<unknown>, unknown[]>;
    listBacklogDocuments: jest.Mock;
    findBacklogDocumentById: jest.Mock;
    createBacklogDocument: jest.Mock;
    count: jest.Mock;
    transaction: jest.Mock;
  };

  let organizationRepository: {
    findUnique: jest.Mock;
  };

  let userRepository: {
    findOrganizationMember: jest.Mock;
    findActiveOrganizationMember: jest.Mock;
    findUnique: jest.Mock;
    findAdmins: jest.Mock;
  };

  let teamRepository: {
    findById: jest.Mock;
  };

  let queueService: {
    addEmail: jest.Mock;
  };

  let teamApplicationRepository: {
    findCandidatesForBacklog?: jest.Mock;
    findUnique: jest.Mock;
    findUniqueWithCv: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };

  let projectsRepository: {
    findProjectByTeamApplicationId: jest.Mock;
    createProject: jest.Mock;
  };
  let filesService: {
    requestUpload: jest.Mock;
    completeUpload: jest.Mock;
  };
  let storageService: {
    createPresignedDownloadUrl: jest.Mock;
  };

  const owner = {
    id: 'owner-1',
    email: 'owner@example.com',
    role: UserRole.COMPANY_OWNER,
    status: 'ACTIVE',
    organizationId: 'org-1',
  } as const;

  const employee = {
    id: 'employee-1',
    email: 'employee@example.com',
    role: UserRole.COMPANY_EMPLOYEE,
    status: 'ACTIVE',
    organizationId: 'org-1',
  } as const;

  const admin = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: 'ACTIVE',
    organizationId: null,
  } as const;

  const student = {
    id: 'student-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: 'ACTIVE',
    organizationId: null,
  } as const;

  const superAdmin = {
    id: 'super-1',
    email: 'super@example.com',
    role: UserRole.SUPER_ADMIN,
    status: 'ACTIVE',
    organizationId: null,
  } as const;

  const activeOrganization = {
    id: 'org-1',
    status: OrganizationStatus.ACTIVE,
  };

  const draftItem = {
    id: 'item-1',
    organizationId: 'org-1',
    title: 'Knowledge base',
    description: 'Build onboarding knowledge base',
    budget: 2500,
    expectedOutcomes: 'Faster onboarding',
    productOwnerUserId: 'employee-1',
    status: BacklogItemStatus.DRAFT,
    organization: {
      id: 'org-1',
      name: 'Org 1',
    },
    documents: [],
    productOwner: {
      id: 'employee-1',
      firstName: 'Emp',
      lastName: 'Loyee',
    },
    createdAt: new Date('2026-05-05T10:00:00.000Z'),
    updatedAt: new Date('2026-05-05T10:00:00.000Z'),
  };

  const publishedItem = {
    ...draftItem,
    status: BacklogItemStatus.PUBLISHED,
  };

  const submittedCandidate = {
    id: 'candidate-1',
    backlogItemId: 'item-1',
    teamId: 'team-1',
    createdById: 'student-1',
    motivation: 'We can deliver this quickly',
    proposalText: 'Implementation plan',
    proposalFileId: null,
    status: ProgramBTeamApplicationStatus.SUBMITTED,
    submittedAt: new Date('2026-05-10T10:00:00.000Z'),
    shortlistedAt: null,
    acceptedAt: null,
    rejectedAt: null,
    withdrawnAt: null,
    decisionReason: null,
    createdAt: new Date('2026-05-10T10:00:00.000Z'),
    updatedAt: new Date('2026-05-10T10:00:00.000Z'),
  };

  beforeEach(() => {
    backlogRepository = {
      create: jest.fn(),
      findUnique: jest.fn<Promise<unknown>, unknown[]>(),
      findDetailUnique: jest.fn<Promise<unknown>, unknown[]>((...args) =>
        backlogRepository.findUnique(...args),
      ),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteDraftById: jest.fn(),
      findMany: jest.fn<Promise<unknown>, unknown[]>(),
      findDetails: jest.fn<Promise<unknown>, unknown[]>((...args) =>
        backlogRepository.findMany(...args),
      ),
      listBacklogDocuments: jest.fn(),
      findBacklogDocumentById: jest.fn(),
      createBacklogDocument: jest.fn(),
      count: jest.fn(),
      transaction: jest.fn((fn: (db: object) => Promise<unknown>) => fn({})),
    };

    organizationRepository = {
      findUnique: jest.fn(),
    };

    userRepository = {
      findOrganizationMember: jest.fn(),
      findActiveOrganizationMember: jest.fn(),
      findUnique: jest.fn(),
      findAdmins: jest.fn().mockResolvedValue([]),
    };

    teamRepository = {
      findById: jest.fn().mockResolvedValue(null),
    };

    queueService = {
      addEmail: jest.fn().mockResolvedValue(undefined),
    };

    teamApplicationRepository = {
      findCandidatesForBacklog: jest.fn(),
      findUnique: jest.fn(),
      findUniqueWithCv: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    };

    projectsRepository = {
      findProjectByTeamApplicationId: jest.fn(),
      createProject: jest.fn(),
    };

    filesService = {
      requestUpload: jest.fn(),
      completeUpload: jest.fn(),
    };

    storageService = {
      createPresignedDownloadUrl: jest.fn(),
    };

    service = new ProgramBBacklogService(
      backlogRepository as never,
      organizationRepository as never,
      userRepository as never,
      teamApplicationRepository as never,
      projectsRepository as never,
      filesService as never,
      storageService as never,
      { hasActiveProgramBCall: jest.fn().mockResolvedValue(true) } as never,
      teamRepository as never,
      queueService as never,
    );
  });

  it('creates a draft backlog item for an active organization member', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    userRepository.findActiveOrganizationMember.mockResolvedValue({
      id: 'employee-1',
    });
    backlogRepository.create.mockResolvedValue(draftItem);
    backlogRepository.findDetailUnique.mockResolvedValue(draftItem);

    const result = await service.create(
      {
        title: draftItem.title,
        productOwnerUserId: draftItem.productOwnerUserId ?? undefined,
      },
      owner as never,
    );

    expect(backlogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        status: BacklogItemStatus.DRAFT,
      }),
    );
    expect(result.id).toBe('item-1');
  });

  it('forbids backlog access for non-active organizations', async () => {
    organizationRepository.findUnique.mockResolvedValue({
      id: 'org-1',
      status: OrganizationStatus.PENDING,
    });

    await expect(
      service.listMy(
        {
          page: 1,
          limit: 20,
          sort: 'updatedAt',
          order: 'desc',
        },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids backlog access for non-active users', async () => {
    await expect(
      service.listMy(
        {
          page: 1,
          limit: 20,
          sort: 'updatedAt',
          order: 'desc',
        },
        { ...owner, status: UserStatus.PENDING } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a backlog document upload with the next category version', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findDetailUnique.mockResolvedValue({
      ...draftItem,
      status: BacklogItemStatus.DRAFT,
    });
    filesService.requestUpload.mockResolvedValue({
      fileId: 'file-1',
      uploadUrl: 'https://upload.example.com',
      expiresAt: new Date('2026-05-18T10:00:00.000Z'),
    });
    backlogRepository.listBacklogDocuments.mockResolvedValue([
      { category: 'OTHER', version: 1 },
      { category: 'OTHER', version: 2 },
      { category: 'SUPPORTING', version: 4 },
    ]);
    backlogRepository.createBacklogDocument.mockResolvedValue({
      id: 'document-1',
    });

    const result = await service.createBacklogDocumentUpload(
      'item-1',
      {
        filename: 'brief.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        category: 'OTHER' as never,
        visibility: 'PARTICIPANTS' as never,
      },
      owner as never,
    );

    expect(filesService.requestUpload).toHaveBeenCalledWith(
      owner,
      expect.objectContaining({
        visibility: FileVisibility.PRIVATE,
      }),
    );
    expect(backlogRepository.createBacklogDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        backlogItemId: 'item-1',
        uploadedFileId: 'file-1',
        version: 3,
        createdById: owner.id,
      }),
      {},
    );
    expect(result.documentId).toBe('document-1');
  });

  it('returns only participant-visible backlog documents to students', async () => {
    backlogRepository.findDetailUnique.mockResolvedValue(publishedItem);
    backlogRepository.listBacklogDocuments.mockResolvedValue([
      {
        id: 'document-1',
        category: 'OTHER',
        visibility: 'PARTICIPANTS',
        version: 1,
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
        uploadedFile: {
          id: 'file-1',
          originalName: 'public.pdf',
          mimeType: 'application/pdf',
          size: 100,
          status: UploadStatus.UPLOADED,
          uploadedAt: new Date('2026-05-17T10:10:00.000Z'),
        },
      },
      {
        id: 'document-2',
        category: 'OTHER',
        visibility: 'INTERNAL',
        version: 2,
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
        uploadedFile: {
          id: 'file-2',
          originalName: 'internal.pdf',
          mimeType: 'application/pdf',
          size: 100,
          status: UploadStatus.UPLOADED,
          uploadedAt: new Date('2026-05-17T10:10:00.000Z'),
        },
      },
    ]);

    await expect(
      service.listBacklogDocuments('item-1', student as never),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'document-1',
        fileId: 'file-1',
      }),
    ]);
  });

  it('rejects backlog document download before the upload is completed', async () => {
    backlogRepository.findDetailUnique.mockResolvedValue(publishedItem);
    backlogRepository.findBacklogDocumentById.mockResolvedValue({
      id: 'document-1',
      backlogItemId: 'item-1',
      visibility: 'PARTICIPANTS',
      uploadedFile: {
        id: 'file-1',
        key: 'uploads/file-1',
        originalName: 'brief.pdf',
        status: UploadStatus.PENDING,
      },
    });

    await expect(
      service.requestBacklogDocumentDownload(
        'item-1',
        'document-1',
        student as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects create when product owner is not in the same organization', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    userRepository.findActiveOrganizationMember.mockResolvedValue(null);

    await expect(
      service.create({ productOwnerUserId: 'other-org-user' }, owner as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns an empty page for listPublished when no active call exists', async () => {
    const callsRepository = {
      hasActiveProgramBCall: jest.fn().mockResolvedValue(false),
    };
    const localService = new ProgramBBacklogService(
      backlogRepository as never,
      organizationRepository as never,
      userRepository as never,
      teamApplicationRepository as never,
      projectsRepository as never,
      filesService as never,
      storageService as never,
      callsRepository as never,
      teamRepository as never,
      queueService as never,
    );

    const result = await localService.listPublished(
      { page: 1, limit: 20, sort: 'updatedAt', order: 'desc' },
      student as never,
    );

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(backlogRepository.findMany).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for findById when no active call exists', async () => {
    const callsRepository = {
      hasActiveProgramBCall: jest.fn().mockResolvedValue(false),
    };
    const localService = new ProgramBBacklogService(
      backlogRepository as never,
      organizationRepository as never,
      userRepository as never,
      teamApplicationRepository as never,
      projectsRepository as never,
      filesService as never,
      storageService as never,
      callsRepository as never,
      teamRepository as never,
      queueService as never,
    );
    backlogRepository.findDetailUnique.mockResolvedValue(publishedItem);

    await expect(
      localService.findById('item-1', student as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists organization backlog items with deterministic sorting', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findMany.mockResolvedValue([draftItem]);
    backlogRepository.count.mockResolvedValue(1);

    const result = await service.listMy(
      {
        page: 1,
        limit: 20,
        sort: 'updatedAt',
        order: 'desc',
        q: 'knowledge',
      },
      owner as never,
    );

    expect(backlogRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
    );
    expect(result.meta.total).toBe(1);
  });

  it('updates draft items only', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...draftItem,
      status: BacklogItemStatus.PUBLISHED,
    });

    await expect(
      service.update('item-1', { title: 'Updated' }, employee as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('shortlists a submitted candidate for a published backlog item', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findUniqueWithCv
      .mockResolvedValueOnce(submittedCandidate)
      .mockResolvedValueOnce({
        ...submittedCandidate,
        status: ProgramBTeamApplicationStatus.SHORTLISTED,
        shortlistedAt: new Date('2026-05-17T10:00:00.000Z'),
        decisionReason: 'Strong domain match.',
      });
    teamApplicationRepository.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.shortlistCandidate(
      'item-1',
      'candidate-1',
      { reason: 'Strong domain match.' },
      owner as never,
    );

    expect(teamApplicationRepository.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'candidate-1',
        backlogItemId: 'item-1',
        status: ProgramBTeamApplicationStatus.SUBMITTED,
      }),
      expect.objectContaining({
        status: ProgramBTeamApplicationStatus.SHORTLISTED,
        decisionReason: 'Strong domain match.',
      }),
      {},
    );
    expect(result.status).toBe(ProgramBTeamApplicationStatus.SHORTLISTED);
  });

  it('lists backlog candidates for company-side review', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findCandidatesForBacklog = jest
      .fn()
      .mockResolvedValue([submittedCandidate]);

    const result = await service.listCandidates('item-1', owner as never);

    expect(
      teamApplicationRepository.findCandidatesForBacklog,
    ).toHaveBeenCalledWith('item-1');
    expect(result).toEqual([submittedCandidate]);
  });

  it('rejects shortlist from non-submitted status', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findUniqueWithCv.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.REJECTED,
    });

    await expect(
      service.shortlistCandidate(
        'item-1',
        'candidate-1',
        { reason: 'Retry' },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('accepts one candidate and rejects the remaining active ones', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findUniqueWithCv
      .mockResolvedValueOnce({
        ...submittedCandidate,
        status: ProgramBTeamApplicationStatus.SHORTLISTED,
      })
      .mockResolvedValueOnce({
        ...submittedCandidate,
        status: ProgramBTeamApplicationStatus.ACCEPTED,
        acceptedAt: new Date('2026-05-17T10:00:00.000Z'),
        decisionReason: 'Best delivery readiness.',
      });
    teamApplicationRepository.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 });

    const result = await service.acceptCandidate(
      'item-1',
      'candidate-1',
      { reason: 'Best delivery readiness.' },
      owner as never,
    );

    expect(teamApplicationRepository.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 'candidate-1',
        backlogItemId: 'item-1',
      }),
      expect.objectContaining({
        status: ProgramBTeamApplicationStatus.ACCEPTED,
        decisionReason: 'Best delivery readiness.',
      }),
      {},
    );
    expect(teamApplicationRepository.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        backlogItemId: 'item-1',
      }),
      expect.objectContaining({
        status: ProgramBTeamApplicationStatus.REJECTED,
      }),
      {},
    );
    expect(result.status).toBe(ProgramBTeamApplicationStatus.ACCEPTED);
  });

  it('rejects accept after candidate was already rejected', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findUniqueWithCv.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.REJECTED,
    });

    await expect(
      service.acceptCandidate(
        'item-1',
        'candidate-1',
        { reason: 'Reconsider' },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps duplicate acceptance races to a conflict', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.transaction.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.acceptCandidate(
        'item-1',
        'candidate-1',
        { reason: 'Winner' },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a project from an accepted candidate and marks it as handed off', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    userRepository.findActiveOrganizationMember.mockResolvedValue({
      id: 'employee-1',
    });
    backlogRepository.findUnique.mockResolvedValue({
      ...publishedItem,
      productOwnerUserId: 'employee-1',
    });
    teamApplicationRepository.findUniqueWithCv.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.ACCEPTED,
    });
    projectsRepository.findProjectByTeamApplicationId.mockResolvedValue(null);
    projectsRepository.createProject.mockResolvedValue({
      id: 'project-1',
      backlogItemId: 'item-1',
      applicationId: null,
      teamApplicationId: 'candidate-1',
      teamId: 'team-1',
      productOwnerUserId: 'employee-1',
      status: 'ACTIVE',
      acceptedByCompanyAt: null,
      acceptedByNtiAt: null,
      createdAt: new Date('2026-05-17T10:00:00.000Z'),
      updatedAt: new Date('2026-05-17T10:00:00.000Z'),
    });
    teamApplicationRepository.update.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.PROJECT_CREATED,
    });

    const result = await service.createProjectFromCandidate(
      'item-1',
      'candidate-1',
      owner as never,
    );

    expect(projectsRepository.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        backlogItemId: 'item-1',
        teamApplicationId: 'candidate-1',
        teamId: 'team-1',
      }),
      {},
    );
    expect(teamApplicationRepository.update).toHaveBeenCalledWith(
      { id: 'candidate-1' },
      { status: ProgramBTeamApplicationStatus.PROJECT_CREATED },
      {},
    );
    expect(result.id).toBe('project-1');
  });

  it('rejects project handoff for non-accepted candidates', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(publishedItem);
    teamApplicationRepository.findUniqueWithCv.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.SHORTLISTED,
    });
    projectsRepository.findProjectByTeamApplicationId.mockResolvedValue(null);

    await expect(
      service.createProjectFromCandidate(
        'item-1',
        'candidate-1',
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects project handoff when backlog item has no product owner', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...publishedItem,
      productOwnerUserId: null,
    });
    teamApplicationRepository.findUniqueWithCv.mockResolvedValue({
      ...submittedCandidate,
      status: ProgramBTeamApplicationStatus.ACCEPTED,
    });
    projectsRepository.findProjectByTeamApplicationId.mockResolvedValue(null);

    await expect(
      service.createProjectFromCandidate(
        'item-1',
        'candidate-1',
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the existing project on duplicate handoff attempts', async () => {
    const existingProject = {
      id: 'project-1',
      backlogItemId: 'item-1',
      applicationId: null,
      teamApplicationId: 'candidate-1',
      teamId: 'team-1',
      productOwnerUserId: 'employee-1',
      status: 'ACTIVE',
      acceptedByCompanyAt: null,
      acceptedByNtiAt: null,
      createdAt: new Date('2026-05-17T10:00:00.000Z'),
      updatedAt: new Date('2026-05-17T10:00:00.000Z'),
    };

    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.transaction.mockRejectedValue({ code: 'P2002' });
    projectsRepository.findProjectByTeamApplicationId.mockResolvedValue(
      existingProject,
    );

    const result = await service.createProjectFromCandidate(
      'item-1',
      'candidate-1',
      owner as never,
    );

    expect(result).toBe(existingProject);
  });

  it('rejects candidate decisions for archived backlog items', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...publishedItem,
      status: BacklogItemStatus.ARCHIVED,
    });

    await expect(
      service.rejectCandidate(
        'item-1',
        'candidate-1',
        { reason: 'Archived backlog' },
        owner as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates draft items via conditional write', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique
      .mockResolvedValueOnce(draftItem)
      .mockResolvedValueOnce({
        ...draftItem,
        title: 'Updated',
      });
    backlogRepository.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.update(
      'item-1',
      { title: 'Updated' },
      employee as never,
    );

    expect(backlogRepository.updateMany).toHaveBeenCalledWith(
      { id: 'item-1', status: BacklogItemStatus.DRAFT },
      { title: 'Updated' },
      expect.anything(),
    );
    expect(backlogRepository.update).not.toHaveBeenCalled();
    expect(result.title).toBe('Updated');
  });

  it('rejects update when item stops being draft before write', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(draftItem);
    backlogRepository.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.update('item-1', { title: 'Updated' }, employee as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 for missing item update', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(null);

    await expect(
      service.update('item-1', { title: 'Updated' }, owner as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids cross-organization access', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...draftItem,
      organizationId: 'org-2',
    });

    await expect(
      service.remove('item-1', owner as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deletes only draft items', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue(draftItem);
    backlogRepository.deleteDraftById.mockResolvedValue({ count: 1 });

    const result = await service.remove('item-1', owner as never);

    expect(backlogRepository.deleteDraftById).toHaveBeenCalledWith(
      'item-1',
      expect.anything(),
    );
    expect(result.id).toBe('item-1');
  });

  it('rejects publish when draft is incomplete', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...draftItem,
      description: null,
    });

    await expect(
      service.publish('item-1', owner as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishes a valid draft item', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique
      .mockResolvedValueOnce(draftItem)
      .mockResolvedValueOnce({
        ...draftItem,
        status: BacklogItemStatus.PUBLISHED,
      });
    userRepository.findActiveOrganizationMember.mockResolvedValue({
      id: 'employee-1',
    });
    backlogRepository.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.publish('item-1', owner as never);

    expect(backlogRepository.findUnique).toHaveBeenNthCalledWith(
      1,
      { id: 'item-1' },
      expect.anything(),
    );
    expect(userRepository.findActiveOrganizationMember).toHaveBeenCalledWith(
      'org-1',
      'employee-1',
      expect.anything(),
    );
    expect(backlogRepository.updateMany).toHaveBeenCalledWith(
      { id: 'item-1', status: BacklogItemStatus.DRAFT },
      { status: BacklogItemStatus.PUBLISHED },
      expect.anything(),
    );
    expect(result.status).toBe(BacklogItemStatus.PUBLISHED);
  });

  it('archives only draft or published items', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique.mockResolvedValue({
      ...draftItem,
      status: BacklogItemStatus.ARCHIVED,
    });

    await expect(
      service.archive('item-1', owner as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('archives without issuing a duplicate update', async () => {
    organizationRepository.findUnique.mockResolvedValue(activeOrganization);
    backlogRepository.findUnique
      .mockResolvedValueOnce(draftItem)
      .mockResolvedValueOnce({
        ...draftItem,
        status: BacklogItemStatus.ARCHIVED,
      });
    backlogRepository.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.archive('item-1', owner as never);

    expect(backlogRepository.updateMany).toHaveBeenCalledWith(
      {
        id: 'item-1',
        status: {
          in: [BacklogItemStatus.DRAFT, BacklogItemStatus.PUBLISHED],
        },
      },
      { status: BacklogItemStatus.ARCHIVED },
      expect.anything(),
    );
    expect(backlogRepository.update).not.toHaveBeenCalled();
    expect(result.status).toBe(BacklogItemStatus.ARCHIVED);
  });

  describe('assignProductOwner', () => {
    const targetUser = {
      id: 'po-user-1',
      organizationId: 'org-1',
      status: 'ACTIVE',
    };

    it('company owner assigns product owner on a draft item', async () => {
      organizationRepository.findUnique.mockResolvedValue(activeOrganization);
      backlogRepository.findUnique
        .mockResolvedValueOnce(draftItem)
        .mockResolvedValueOnce({
          ...draftItem,
          productOwnerUserId: 'po-user-1',
        });
      userRepository.findUnique.mockResolvedValue(targetUser);
      userRepository.findActiveOrganizationMember.mockResolvedValue(targetUser);
      backlogRepository.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.assignProductOwner(
        'item-1',
        { productOwnerUserId: 'po-user-1' },
        owner as never,
      );

      expect(backlogRepository.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'item-1' }),
        { productOwnerUserId: 'po-user-1' },
        expect.anything(),
      );
      expect(result.productOwnerUserId).toBe('po-user-1');
    });

    it('company owner assigns product owner on a published item', async () => {
      organizationRepository.findUnique.mockResolvedValue(activeOrganization);
      backlogRepository.findUnique
        .mockResolvedValueOnce(publishedItem)
        .mockResolvedValueOnce({
          ...publishedItem,
          productOwnerUserId: 'po-user-1',
        });
      userRepository.findUnique.mockResolvedValue(targetUser);
      userRepository.findActiveOrganizationMember.mockResolvedValue(targetUser);
      backlogRepository.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.assignProductOwner(
        'item-1',
        { productOwnerUserId: 'po-user-1' },
        owner as never,
      );

      expect(result.productOwnerUserId).toBe('po-user-1');
    });

    it('admin assigns product owner without organization membership check', async () => {
      backlogRepository.findUnique
        .mockResolvedValueOnce(draftItem)
        .mockResolvedValueOnce({
          ...draftItem,
          productOwnerUserId: 'po-user-1',
        });
      userRepository.findUnique.mockResolvedValue(targetUser);
      userRepository.findActiveOrganizationMember.mockResolvedValue(targetUser);
      backlogRepository.updateMany.mockResolvedValue({ count: 1 });

      await service.assignProductOwner(
        'item-1',
        { productOwnerUserId: 'po-user-1' },
        admin as never,
      );

      expect(organizationRepository.findUnique).not.toHaveBeenCalled();
    });

    it('super admin assigns product owner without organization membership check', async () => {
      backlogRepository.findUnique
        .mockResolvedValueOnce(draftItem)
        .mockResolvedValueOnce({
          ...draftItem,
          productOwnerUserId: 'po-user-1',
        });
      userRepository.findUnique.mockResolvedValue(targetUser);
      userRepository.findActiveOrganizationMember.mockResolvedValue(targetUser);
      backlogRepository.updateMany.mockResolvedValue({ count: 1 });

      await service.assignProductOwner(
        'item-1',
        { productOwnerUserId: 'po-user-1' },
        superAdmin as never,
      );

      expect(organizationRepository.findUnique).not.toHaveBeenCalled();
    });

    it('rejects assignment on archived backlog item with 409', async () => {
      organizationRepository.findUnique.mockResolvedValue(activeOrganization);
      backlogRepository.findUnique.mockResolvedValue({
        ...draftItem,
        status: BacklogItemStatus.ARCHIVED,
      });

      await expect(
        service.assignProductOwner(
          'item-1',
          { productOwnerUserId: 'po-user-1' },
          owner as never,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns 404 when target user does not exist', async () => {
      organizationRepository.findUnique.mockResolvedValue(activeOrganization);
      backlogRepository.findUnique.mockResolvedValue(draftItem);
      userRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.assignProductOwner(
          'item-1',
          { productOwnerUserId: 'unknown-user' },
          owner as never,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects assignment when target user belongs to a different organization', async () => {
      organizationRepository.findUnique.mockResolvedValue(activeOrganization);
      backlogRepository.findUnique.mockResolvedValue(draftItem);
      userRepository.findUnique.mockResolvedValue({
        id: 'other-org-user',
        organizationId: 'org-2',
        status: 'ACTIVE',
      });
      userRepository.findActiveOrganizationMember.mockResolvedValue(null);

      await expect(
        service.assignProductOwner(
          'item-1',
          { productOwnerUserId: 'other-org-user' },
          owner as never,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects assignment when target user is inactive', async () => {
      organizationRepository.findUnique.mockResolvedValue(activeOrganization);
      backlogRepository.findUnique.mockResolvedValue(draftItem);
      userRepository.findUnique.mockResolvedValue({
        id: 'inactive-user',
        organizationId: 'org-1',
        status: UserStatus.PENDING,
      });
      userRepository.findActiveOrganizationMember.mockResolvedValue(null);

      await expect(
        service.assignProductOwner(
          'item-1',
          { productOwnerUserId: 'inactive-user' },
          owner as never,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns 404 when backlog item does not exist (admin path)', async () => {
      backlogRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.assignProductOwner(
          'nonexistent-item',
          { productOwnerUserId: 'po-user-1' },
          admin as never,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns 404 when backlog item does not exist (company owner path)', async () => {
      organizationRepository.findUnique.mockResolvedValue(activeOrganization);
      backlogRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.assignProductOwner(
          'nonexistent-item',
          { productOwnerUserId: 'po-user-1' },
          owner as never,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when item is archived concurrently during transaction', async () => {
      organizationRepository.findUnique.mockResolvedValue(activeOrganization);
      backlogRepository.findUnique
        .mockResolvedValueOnce(draftItem)
        .mockResolvedValueOnce({
          ...draftItem,
          status: BacklogItemStatus.ARCHIVED,
        });
      userRepository.findUnique.mockResolvedValue(targetUser);
      userRepository.findActiveOrganizationMember.mockResolvedValue(targetUser);
      backlogRepository.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.assignProductOwner(
          'item-1',
          { productOwnerUserId: 'po-user-1' },
          owner as never,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when item is deleted concurrently during transaction', async () => {
      organizationRepository.findUnique.mockResolvedValue(activeOrganization);
      backlogRepository.findUnique
        .mockResolvedValueOnce(draftItem)
        .mockResolvedValueOnce(null);
      userRepository.findUnique.mockResolvedValue(targetUser);
      userRepository.findActiveOrganizationMember.mockResolvedValue(targetUser);
      backlogRepository.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.assignProductOwner(
          'item-1',
          { productOwnerUserId: 'po-user-1' },
          owner as never,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assertProductOwnerOrAdmin', () => {
    it('allows the assigned product owner to act', () => {
      expect(() =>
        service.assertProductOwnerOrAdmin(
          { ...owner, id: 'employee-1' } as never,
          { ...draftItem, productOwnerUserId: 'employee-1' },
        ),
      ).not.toThrow();
    });

    it('allows admin to act regardless of product owner assignment', () => {
      expect(() =>
        service.assertProductOwnerOrAdmin(admin as never, {
          ...draftItem,
          productOwnerUserId: 'someone-else',
        }),
      ).not.toThrow();
    });

    it('allows super admin to act regardless of product owner assignment', () => {
      expect(() =>
        service.assertProductOwnerOrAdmin(superAdmin as never, {
          ...draftItem,
          productOwnerUserId: 'someone-else',
        }),
      ).not.toThrow();
    });

    it('forbids non-PO non-admin users', () => {
      expect(() =>
        service.assertProductOwnerOrAdmin(
          { ...owner, id: 'other-user' } as never,
          { ...draftItem, productOwnerUserId: 'employee-1' },
        ),
      ).toThrow(ForbiddenException);
    });
  });
});

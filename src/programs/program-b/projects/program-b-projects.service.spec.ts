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
  }),
  { virtual: true },
);

import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  ProgramBMilestoneStatus,
  ProgramBPoDecision,
  ProgramBProjectStatus,
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
    createMilestone: jest.Mock;
    updateMilestoneForProject: jest.Mock;
    findMilestoneForProject: jest.Mock;
    createMentoringNote: jest.Mock;
    createPoReview: jest.Mock;
    updateProjectAcceptance: jest.Mock;
  };

  const companyUser = {
    id: 'company-user-1',
    email: 'company@example.com',
    role: UserRole.COMPANY_EMPLOYEE,
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
    teamId: 'team-1',
    productOwnerUserId: 'po-1',
    status: ProgramBProjectStatus.ACTIVE,
    acceptedByCompanyAt: null,
    acceptedByNtiAt: null,
    createdAt: new Date('2026-05-17T10:00:00.000Z'),
    updatedAt: new Date('2026-05-17T10:00:00.000Z'),
    backlogItem: {
      id: 'backlog-1',
      organizationId: 'org-1',
    },
  };

  beforeEach(() => {
    projectsRepository = {
      transaction: jest.fn((fn: (db: object) => Promise<unknown>) =>
        fn({ tx: 'db-client' }),
      ),
      findProjectForExecution: jest.fn().mockResolvedValue(activeProject),
      createMilestone: jest.fn(),
      updateMilestoneForProject: jest.fn(),
      findMilestoneForProject: jest.fn(),
      createMentoringNote: jest.fn(),
      createPoReview: jest.fn(),
      updateProjectAcceptance: jest.fn(),
    };

    service = new ProgramBProjectsService(projectsRepository as never);
  });

  it('creates a milestone for a company-side project member', async () => {
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

  it('creates mentoring notes for NTI-side reviewers and mentors', async () => {
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

  it('closes the project only after both final acceptances are present', async () => {
    const companyAcceptedProject = {
      ...activeProject,
      acceptedByCompanyAt: new Date('2026-05-17T11:00:00.000Z'),
    };
    projectsRepository.findProjectForExecution.mockResolvedValue(
      companyAcceptedProject,
    );
    projectsRepository.updateProjectAcceptance.mockResolvedValue({
      ...companyAcceptedProject,
      acceptedByNtiAt: new Date('2026-05-17T12:00:00.000Z'),
      status: ProgramBProjectStatus.CLOSED,
    });

    const result = await service.recordFinalAcceptance(
      'project-1',
      { side: ProgramBFinalAcceptanceSide.NTI },
      admin as never,
    );

    expect(projectsRepository.updateProjectAcceptance).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({
        acceptedByNtiAt: expect.any(Date) as Date,
        status: ProgramBProjectStatus.CLOSED,
      }),
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

    const result = await service.recordFinalAcceptance(
      'project-1',
      { side: ProgramBFinalAcceptanceSide.COMPANY },
      productOwner as never,
    );

    expect(projectsRepository.updateProjectAcceptance).not.toHaveBeenCalled();
    expect(result).toBe(acceptedProject);
  });

  it('rejects normal writes after closure', async () => {
    projectsRepository.findProjectForExecution.mockResolvedValue({
      ...activeProject,
      status: ProgramBProjectStatus.CLOSED,
      acceptedByCompanyAt: new Date('2026-05-17T11:00:00.000Z'),
      acceptedByNtiAt: new Date('2026-05-17T12:00:00.000Z'),
    });

    await expect(
      service.createMilestone(
        'project-1',
        { title: 'Late milestone' },
        companyUser as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

jest.mock('./student-profile.repository', () => ({
  StudentProfileRepository: class StudentProfileRepository {},
}));

import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  DegreeLevel,
  StudentFocusArea,
  StudentPreferredRole,
  StudentSkillLevel,
  UploadStatus,
} from '../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ProfileNotFoundError } from './student-profile.errors';
import { StudentProfileService } from './student-profile.service';

describe('StudentProfileService', () => {
  let service: StudentProfileService;
  let repository: {
    findUserIdentityById: jest.Mock;
    findByUserIdWithRelations: jest.Mock;
    findUniversityById: jest.Mock;
    findFacultyById: jest.Mock;
    findSpecializationById: jest.Mock;
    findUploadedFileForOwner: jest.Mock;
    upsertAcademicInformation: jest.Mock;
    replaceProfessionalSkills: jest.Mock;
    markCompleted: jest.Mock;
    transaction: jest.Mock;
  };

  const authUser: AuthenticatedUserContext = {
    id: 'user-1',
    email: 'student@example.com',
    role: 'STUDENT',
    status: 'ACTIVE',
  };

  const baseProfile = () => ({
    id: 'profile-1',
    userId: authUser.id,
    universityId: 'university-1',
    facultyId: 'faculty-1',
    specializationId: 'specialization-1',
    degreeLevel: DegreeLevel.BACHELOR,
    studyMode: null,
    studyYear: 2,
    expectedGraduationYear: null,
    hasTransferredSubjects: null,
    transferredSubjectsCount: null,
    profileSubjectsAverage: null,
    relevantCourses: [],
    academicAchievements: null,
    academicEvidenceFileId: null,
    academicDeclarationAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
    focusAreas: [StudentFocusArea.SOFTWARE_DEVELOPMENT],
    preferredRoles: [StudentPreferredRole.BACKEND],
    softSkills: [],
    githubUrl: null,
    linkedinUrl: null,
    portfolioUrl: null,
    bio: null,
    cvFileId: 'file-1',
    profileCompletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    user: {
      id: authUser.id,
      firstName: 'Test',
      lastName: 'Student',
      email: authUser.email,
    },
    skills: [
      {
        id: 'skill-1',
        studentProfileId: 'profile-1',
        name: 'TypeScript',
        level: StudentSkillLevel.INTERMEDIATE,
        experienceMonths: 18,
        isPrimary: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ],
    projects: [],
  });

  beforeEach(() => {
    repository = {
      findUserIdentityById: jest.fn().mockResolvedValue({
        id: authUser.id,
        firstName: 'Test',
        lastName: 'Student',
        email: authUser.email,
      }),
      findByUserIdWithRelations: jest.fn().mockResolvedValue(baseProfile()),
      findUniversityById: jest
        .fn()
        .mockResolvedValue({ id: 'university-1', isActive: true }),
      findFacultyById: jest.fn().mockResolvedValue({
        id: 'faculty-1',
        universityId: 'university-1',
        isActive: true,
      }),
      findSpecializationById: jest.fn().mockResolvedValue({
        id: 'specialization-1',
        facultyId: 'faculty-1',
        isActive: true,
      }),
      findUploadedFileForOwner: jest
        .fn()
        .mockResolvedValue({ id: 'file-1', status: UploadStatus.UPLOADED }),
      upsertAcademicInformation: jest.fn().mockResolvedValue(baseProfile()),
      replaceProfessionalSkills: jest.fn().mockResolvedValue(baseProfile()),
      markCompleted: jest.fn().mockResolvedValue(baseProfile()),
      transaction: jest.fn((callback: (db: object) => Promise<unknown>) =>
        callback({}),
      ),
    };

    service = new StudentProfileService(repository as never);
  });

  it('returns an empty profile payload when user exists but profile is missing', async () => {
    repository.findByUserIdWithRelations.mockResolvedValueOnce(null);

    const result = await service.getMyProfile(authUser);

    expect(result.user.id).toBe(authUser.id);
    expect(result.profile).toBeNull();
    expect(result.skills).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.completion.profileCompleted).toBe(false);
  });

  it('throws NotFoundException when user identity does not exist', async () => {
    repository.findUserIdentityById.mockResolvedValueOnce(null);

    await expect(service.getMyProfile(authUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects academic update when declaration is not accepted', async () => {
    await expect(
      service.updateAcademicInformation(authUser, {
        universityId: 'university-1',
        facultyId: 'faculty-1',
        specializationId: 'specialization-1',
        degreeLevel: DegreeLevel.BACHELOR,
        studyYear: 2,
        hasTransferredSubjects: false,
        academicDeclarationAccepted: false,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(repository.upsertAcademicInformation).not.toHaveBeenCalled();
  });

  it('maps ProfileNotFoundError to a user-facing UnprocessableEntityException', async () => {
    repository.replaceProfessionalSkills.mockRejectedValueOnce(
      new ProfileNotFoundError(),
    );

    await expect(
      service.updateProfessionalSkills(authUser, {
        cvFileId: 'file-1',
        focusAreas: [StudentFocusArea.SOFTWARE_DEVELOPMENT],
        preferredRoles: [StudentPreferredRole.BACKEND],
        skills: [
          {
            name: 'TypeScript',
            level: StudentSkillLevel.INTERMEDIATE,
            isPrimary: true,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects completion when required professional fields are missing', async () => {
    repository.findByUserIdWithRelations.mockResolvedValueOnce({
      ...baseProfile(),
      focusAreas: [],
      preferredRoles: [],
      cvFileId: null,
      skills: [],
    });

    await expect(service.completeProfile(authUser)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('rejects professional update when cv file is not uploaded', async () => {
    repository.findUploadedFileForOwner.mockResolvedValueOnce({
      id: 'file-1',
      status: UploadStatus.PENDING,
    });

    await expect(
      service.updateProfessionalSkills(authUser, {
        cvFileId: 'file-1',
        focusAreas: [StudentFocusArea.SOFTWARE_DEVELOPMENT],
        preferredRoles: [StudentPreferredRole.BACKEND],
        skills: [
          {
            name: 'TypeScript',
            level: StudentSkillLevel.INTERMEDIATE,
            isPrimary: true,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

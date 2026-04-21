jest.mock(
  '../../../generated/prisma/client',
  () => ({
    Prisma: {
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
        code: string;

        constructor(
          message: string,
          options: { code: string; clientVersion: string },
        ) {
          super(message);
          this.name = 'PrismaClientKnownRequestError';
          this.code = options.code;
        }
      },
    },
  }),
  { virtual: true },
);

jest.mock('@prisma/client', () => ({}), { virtual: true });

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { UserRole, UserStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { AdminAcademicStructureRepository } from './admin-academic-structure.repository';
import { AdminAcademicStructureService } from './admin-academic-structure.service';

describe('AdminAcademicStructureService', () => {
  let service: AdminAcademicStructureService;
  let repository: {
    findUniversities: jest.Mock;
    findFacultiesByUniversityId: jest.Mock;
    findSpecializationsByFacultyId: jest.Mock;
    findUniversityById: jest.Mock;
    findFacultyById: jest.Mock;
    findSpecializationById: jest.Mock;
    createUniversity: jest.Mock;
    updateUniversity: jest.Mock;
    createFaculty: jest.Mock;
    updateFaculty: jest.Mock;
    createSpecialization: jest.Mock;
    updateSpecialization: jest.Mock;
    deleteUniversity: jest.Mock;
    deleteFaculty: jest.Mock;
    deleteSpecialization: jest.Mock;
  };

  const adminActor: AuthenticatedUserContext = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    organizationId: null,
  };

  const nonAdminActor: AuthenticatedUserContext = {
    id: 'student-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    organizationId: null,
  };

  const prismaKnownError = (code: 'P2002' | 'P2003' | 'P2025') =>
    new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });

  beforeEach(() => {
    repository = {
      findUniversities: jest.fn().mockResolvedValue([]),
      findFacultiesByUniversityId: jest.fn().mockResolvedValue([]),
      findSpecializationsByFacultyId: jest.fn().mockResolvedValue([]),
      findUniversityById: jest.fn().mockResolvedValue({ id: 'uni-1' }),
      findFacultyById: jest.fn().mockResolvedValue({ id: 'fac-1' }),
      findSpecializationById: jest.fn().mockResolvedValue({ id: 'spec-1' }),
      createUniversity: jest.fn().mockResolvedValue({
        id: 'uni-1',
        name: 'University 1',
        shortName: 'U1',
        website: null,
        city: null,
        country: null,
        isActive: true,
      }),
      updateUniversity: jest.fn(),
      createFaculty: jest.fn(),
      updateFaculty: jest.fn(),
      createSpecialization: jest.fn(),
      updateSpecialization: jest.fn(),
      deleteUniversity: jest.fn().mockResolvedValue(undefined),
      deleteFaculty: jest.fn().mockResolvedValue(undefined),
      deleteSpecialization: jest.fn().mockResolvedValue(undefined),
    };

    service = new AdminAcademicStructureService(
      repository as unknown as AdminAcademicStructureRepository,
    );
  });

  it('rejects non-admin users', async () => {
    await expect(
      service.getUniversities(nonAdminActor, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('passes includeInactive=false by default and trims search', async () => {
    await service.getUniversities(adminActor, { search: '  uni  ' });

    expect(repository.findUniversities).toHaveBeenCalledWith({
      search: 'uni',
      includeInactive: false,
    });
  });

  it('maps P2002 write errors to BadRequestException', async () => {
    repository.createUniversity.mockRejectedValueOnce(
      prismaKnownError('P2002'),
    );

    await expect(
      service.createUniversity(adminActor, { name: 'U', isActive: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps P2003 write errors to BadRequestException', async () => {
    repository.createSpecialization.mockRejectedValueOnce(
      prismaKnownError('P2003'),
    );

    await expect(
      service.createSpecialization(adminActor, {
        facultyId: 'fac-1',
        name: 'Spec A',
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps P2025 from updateSpecialization to NotFoundException', async () => {
    repository.updateSpecialization.mockRejectedValueOnce(
      prismaKnownError('P2025'),
    );

    await expect(
      service.updateSpecialization(adminActor, 'spec-1', { name: 'Updated' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps delete foreign-key constraint errors to BadRequestException', async () => {
    repository.deleteUniversity.mockRejectedValueOnce(
      prismaKnownError('P2003'),
    );

    await expect(
      service.deleteUniversity(adminActor, 'uni-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

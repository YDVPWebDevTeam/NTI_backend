import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/database';

type ListFilter = {
  search?: string;
  includeInactive: boolean;
};

@Injectable()
export class AdminAcademicStructureRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUniversities(filter: ListFilter) {
    return this.prisma.client.university.findMany({
      where: {
        isActive: filter.includeInactive ? undefined : true,
        OR: filter.search
          ? [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { shortName: { contains: filter.search, mode: 'insensitive' } },
              { city: { contains: filter.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  findFacultiesByUniversityId(universityId: string, includeInactive: boolean) {
    return this.prisma.client.faculty.findMany({
      where: {
        universityId,
        isActive: includeInactive ? undefined : true,
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  findSpecializationsByFacultyId(facultyId: string, includeInactive: boolean) {
    return this.prisma.client.specialization.findMany({
      where: {
        facultyId,
        isActive: includeInactive ? undefined : true,
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  findUniversityById(universityId: string) {
    return this.prisma.client.university.findUnique({
      where: { id: universityId },
    });
  }

  findFacultyById(facultyId: string) {
    return this.prisma.client.faculty.findUnique({ where: { id: facultyId } });
  }

  findSpecializationById(specializationId: string) {
    return this.prisma.client.specialization.findUnique({
      where: { id: specializationId },
    });
  }

  createUniversity(data: Prisma.UniversityUncheckedCreateInput) {
    return this.prisma.client.university.create({ data });
  }

  updateUniversity(
    universityId: string,
    data: Prisma.UniversityUncheckedUpdateInput,
  ) {
    return this.prisma.client.university.update({
      where: { id: universityId },
      data,
    });
  }

  createFaculty(data: Prisma.FacultyUncheckedCreateInput) {
    return this.prisma.client.faculty.create({ data });
  }

  updateFaculty(facultyId: string, data: Prisma.FacultyUncheckedUpdateInput) {
    return this.prisma.client.faculty.update({
      where: { id: facultyId },
      data,
    });
  }

  createSpecialization(data: Prisma.SpecializationUncheckedCreateInput) {
    return this.prisma.client.specialization.create({ data });
  }

  updateSpecialization(
    specializationId: string,
    data: Prisma.SpecializationUncheckedUpdateInput,
  ) {
    return this.prisma.client.specialization.update({
      where: { id: specializationId },
      data,
    });
  }

  deleteUniversity(universityId: string) {
    return this.prisma.client.university.delete({
      where: { id: universityId },
    });
  }

  deleteFaculty(facultyId: string) {
    return this.prisma.client.faculty.delete({ where: { id: facultyId } });
  }

  deleteSpecialization(specializationId: string) {
    return this.prisma.client.specialization.delete({
      where: { id: specializationId },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';

type UniversitiesFilter = {
  search?: string;
  activeOnly: boolean;
};

@Injectable()
export class AcademicStructureRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUniversities(filter: UniversitiesFilter) {
    return this.prisma.client.university.findMany({
      where: {
        isActive: filter.activeOnly ? true : undefined,
        OR: filter.search
          ? [
              {
                name: {
                  contains: filter.search,
                  mode: 'insensitive',
                },
              },
              {
                shortName: {
                  contains: filter.search,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      select: {
        id: true,
        name: true,
        shortName: true,
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  findFacultiesByUniversityId(universityId: string) {
    return this.prisma.client.faculty.findMany({
      where: {
        universityId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        shortName: true,
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  findSpecializationsByFacultyId(facultyId: string) {
    return this.prisma.client.specialization.findMany({
      where: {
        facultyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        degreeLabel: true,
      },
      orderBy: [{ name: 'asc' }],
    });
  }
}

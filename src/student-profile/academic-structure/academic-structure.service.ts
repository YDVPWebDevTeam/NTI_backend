import { Injectable } from '@nestjs/common';
import {
  FacultyLookupDto,
  SpecializationLookupDto,
  UniversityLookupDto,
} from './dto/academic-structure.dto';
import { UniversitiesQueryDto } from './dto/universities-query.dto';
import { AcademicStructureRepository } from './academic-structure.repository';

@Injectable()
export class AcademicStructureService {
  constructor(private readonly repository: AcademicStructureRepository) {}

  async getUniversities(
    query: UniversitiesQueryDto,
  ): Promise<UniversityLookupDto[]> {
    const universities = await this.repository.findUniversities({
      search: query.search?.trim(),
      activeOnly: query.activeOnly ?? true,
    });

    return universities.map((university) => ({
      ...university,
      shortName: university.shortName ?? undefined,
    }));
  }

  async getFaculties(universityId: string): Promise<FacultyLookupDto[]> {
    const faculties =
      await this.repository.findFacultiesByUniversityId(universityId);

    return faculties.map((faculty) => ({
      ...faculty,
      shortName: faculty.shortName ?? undefined,
    }));
  }

  async getSpecializations(
    facultyId: string,
  ): Promise<SpecializationLookupDto[]> {
    const specializations =
      await this.repository.findSpecializationsByFacultyId(facultyId);

    return specializations.map((specialization) => ({
      ...specialization,
      code: specialization.code ?? undefined,
      degreeLabel: specialization.degreeLabel ?? undefined,
    }));
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import {
  AdminFacultyDto,
  AdminSpecializationDto,
  AdminUniversityDto,
} from './dto/admin-academic-structure-response.dto';
import { ListAcademicStructureQueryDto } from './dto/list-academic-structure-query.dto';
import { CreateFacultyDto, UpdateFacultyDto } from './dto/upsert-faculty.dto';
import {
  CreateSpecializationDto,
  UpdateSpecializationDto,
} from './dto/upsert-specialization.dto';
import {
  CreateUniversityDto,
  UpdateUniversityDto,
} from './dto/upsert-university.dto';
import { AdminAcademicStructureRepository } from './admin-academic-structure.repository';

@Injectable()
export class AdminAcademicStructureService {
  constructor(private readonly repository: AdminAcademicStructureRepository) {}

  async getUniversities(
    actor: AuthenticatedUserContext,
    query: ListAcademicStructureQueryDto,
  ): Promise<AdminUniversityDto[]> {
    ensureAdminRole(
      actor.role,
      'Only administrators can access academic structure',
    );

    const rows = await this.repository.findUniversities({
      search: query.search?.trim(),
      includeInactive: query.includeInactive ?? false,
    });

    return rows.map((row) => this.toUniversityDto(row));
  }

  async getFaculties(
    actor: AuthenticatedUserContext,
    universityId: string,
    query: ListAcademicStructureQueryDto,
  ): Promise<AdminFacultyDto[]> {
    ensureAdminRole(
      actor.role,
      'Only administrators can access academic structure',
    );

    await this.assertUniversityExists(universityId);

    const rows = await this.repository.findFacultiesByUniversityId(
      universityId,
      query.includeInactive ?? false,
    );

    return rows.map((row) => this.toFacultyDto(row));
  }

  async getSpecializations(
    actor: AuthenticatedUserContext,
    facultyId: string,
    query: ListAcademicStructureQueryDto,
  ): Promise<AdminSpecializationDto[]> {
    ensureAdminRole(
      actor.role,
      'Only administrators can access academic structure',
    );

    await this.assertFacultyExists(facultyId);

    const rows = await this.repository.findSpecializationsByFacultyId(
      facultyId,
      query.includeInactive ?? false,
    );

    return rows.map((row) => this.toSpecializationDto(row));
  }

  async createUniversity(
    actor: AuthenticatedUserContext,
    dto: CreateUniversityDto,
  ): Promise<AdminUniversityDto> {
    ensureAdminRole(
      actor.role,
      'Only administrators can manage academic structure',
    );

    try {
      const row = await this.repository.createUniversity({
        name: dto.name.trim(),
        shortName: dto.shortName?.trim(),
        website: dto.website?.trim(),
        city: dto.city?.trim(),
        country: dto.country?.trim().toLowerCase(),
        isActive: dto.isActive ?? true,
      });

      return this.toUniversityDto(row);
    } catch (error) {
      this.handlePrismaWriteError(
        error,
        'University with same unique fields already exists',
      );
    }
  }

  async updateUniversity(
    actor: AuthenticatedUserContext,
    universityId: string,
    dto: UpdateUniversityDto,
  ): Promise<AdminUniversityDto> {
    ensureAdminRole(
      actor.role,
      'Only administrators can manage academic structure',
    );
    await this.assertUniversityExists(universityId);

    try {
      const row = await this.repository.updateUniversity(universityId, {
        name: dto.name?.trim(),
        shortName: dto.shortName?.trim(),
        website: dto.website?.trim(),
        city: dto.city?.trim(),
        country: dto.country?.trim().toLowerCase(),
        isActive: dto.isActive,
      });

      return this.toUniversityDto(row);
    } catch (error) {
      this.handlePrismaWriteError(
        error,
        'University with same unique fields already exists',
      );
    }
  }

  async createFaculty(
    actor: AuthenticatedUserContext,
    dto: CreateFacultyDto,
  ): Promise<AdminFacultyDto> {
    ensureAdminRole(
      actor.role,
      'Only administrators can manage academic structure',
    );
    await this.assertUniversityExists(dto.universityId);

    try {
      const row = await this.repository.createFaculty({
        universityId: dto.universityId,
        name: dto.name.trim(),
        shortName: dto.shortName?.trim(),
        isActive: dto.isActive ?? true,
      });

      return this.toFacultyDto(row);
    } catch (error) {
      this.handlePrismaWriteError(
        error,
        'Faculty with this name already exists in selected university',
      );
    }
  }

  async updateFaculty(
    actor: AuthenticatedUserContext,
    facultyId: string,
    dto: UpdateFacultyDto,
  ): Promise<AdminFacultyDto> {
    ensureAdminRole(
      actor.role,
      'Only administrators can manage academic structure',
    );
    await this.assertFacultyExists(facultyId);

    if (dto.universityId) {
      await this.assertUniversityExists(dto.universityId);
    }

    try {
      const row = await this.repository.updateFaculty(facultyId, {
        universityId: dto.universityId,
        name: dto.name?.trim(),
        shortName: dto.shortName?.trim(),
        isActive: dto.isActive,
      });

      return this.toFacultyDto(row);
    } catch (error) {
      this.handlePrismaWriteError(
        error,
        'Faculty with this name already exists in selected university',
      );
    }
  }

  async createSpecialization(
    actor: AuthenticatedUserContext,
    dto: CreateSpecializationDto,
  ): Promise<AdminSpecializationDto> {
    ensureAdminRole(
      actor.role,
      'Only administrators can manage academic structure',
    );
    await this.assertFacultyExists(dto.facultyId);

    try {
      const row = await this.repository.createSpecialization({
        facultyId: dto.facultyId,
        name: dto.name.trim(),
        code: dto.code?.trim(),
        degreeLabel: dto.degreeLabel?.trim(),
        isActive: dto.isActive ?? true,
      });

      return this.toSpecializationDto(row);
    } catch (error) {
      this.handlePrismaWriteError(
        error,
        'Specialization with this name already exists in selected faculty',
      );
    }
  }

  async updateSpecialization(
    actor: AuthenticatedUserContext,
    specializationId: string,
    dto: UpdateSpecializationDto,
  ): Promise<AdminSpecializationDto> {
    ensureAdminRole(
      actor.role,
      'Only administrators can manage academic structure',
    );
    await this.assertSpecializationExists(specializationId);

    if (dto.facultyId) {
      await this.assertFacultyExists(dto.facultyId);
    }

    try {
      const row = await this.repository.updateSpecialization(specializationId, {
        facultyId: dto.facultyId,
        name: dto.name?.trim(),
        code: dto.code?.trim(),
        degreeLabel: dto.degreeLabel?.trim(),
        isActive: dto.isActive,
      });

      return this.toSpecializationDto(row);
    } catch (error) {
      if (this.isPrismaNotFoundError(error)) {
        throw new NotFoundException('Specialization not found');
      }

      this.handlePrismaWriteError(
        error,
        'Specialization with this name already exists in selected faculty',
      );
    }
  }

  async deleteUniversity(
    actor: AuthenticatedUserContext,
    universityId: string,
  ): Promise<void> {
    ensureAdminRole(
      actor.role,
      'Only administrators can manage academic structure',
    );

    try {
      await this.repository.deleteUniversity(universityId);
    } catch (error) {
      this.handleDeleteError(error, 'University');
    }
  }

  async deleteFaculty(
    actor: AuthenticatedUserContext,
    facultyId: string,
  ): Promise<void> {
    ensureAdminRole(
      actor.role,
      'Only administrators can manage academic structure',
    );

    try {
      await this.repository.deleteFaculty(facultyId);
    } catch (error) {
      this.handleDeleteError(error, 'Faculty');
    }
  }

  async deleteSpecialization(
    actor: AuthenticatedUserContext,
    specializationId: string,
  ): Promise<void> {
    ensureAdminRole(
      actor.role,
      'Only administrators can manage academic structure',
    );

    try {
      await this.repository.deleteSpecialization(specializationId);
    } catch (error) {
      this.handleDeleteError(error, 'Specialization');
    }
  }

  private async assertUniversityExists(universityId: string): Promise<void> {
    const university = await this.repository.findUniversityById(universityId);

    if (!university) {
      throw new NotFoundException('University not found');
    }
  }

  private async assertFacultyExists(facultyId: string): Promise<void> {
    const faculty = await this.repository.findFacultyById(facultyId);

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }
  }

  private async assertSpecializationExists(
    specializationId: string,
  ): Promise<void> {
    const specialization =
      await this.repository.findSpecializationById(specializationId);

    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }
  }

  private toUniversityDto(row: {
    id: string;
    name: string;
    shortName: string | null;
    website: string | null;
    city: string | null;
    country: string | null;
    isActive: boolean;
  }): AdminUniversityDto {
    return {
      id: row.id,
      name: row.name,
      shortName: row.shortName ?? undefined,
      website: row.website ?? undefined,
      city: row.city ?? undefined,
      country: row.country ?? undefined,
      isActive: row.isActive,
    };
  }

  private toFacultyDto(row: {
    id: string;
    universityId: string;
    name: string;
    shortName: string | null;
    isActive: boolean;
  }): AdminFacultyDto {
    return {
      id: row.id,
      universityId: row.universityId,
      name: row.name,
      shortName: row.shortName ?? undefined,
      isActive: row.isActive,
    };
  }

  private toSpecializationDto(row: {
    id: string;
    facultyId: string;
    name: string;
    code: string | null;
    degreeLabel: string | null;
    isActive: boolean;
  }): AdminSpecializationDto {
    return {
      id: row.id,
      facultyId: row.facultyId,
      name: row.name,
      code: row.code ?? undefined,
      degreeLabel: row.degreeLabel ?? undefined,
      isActive: row.isActive,
    };
  }

  private handlePrismaWriteError(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException(message);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new BadRequestException('Referenced relation does not exist');
    }

    throw error;
  }

  private isPrismaNotFoundError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }

  private handleDeleteError(error: unknown, entity: string): never {
    if (this.isPrismaNotFoundError(error)) {
      throw new NotFoundException(`${entity} not found`);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new BadRequestException(
        `${entity} cannot be deleted because it is referenced by existing data`,
      );
    }

    throw error;
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums';
import { GetUserContext } from '../../auth/decorators/get-user-context.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import {
  CreateAdminFacultyApi,
  CreateAdminSpecializationApi,
  CreateAdminUniversityApi,
  DeleteAdminFacultyApi,
  DeleteAdminSpecializationApi,
  DeleteAdminUniversityApi,
  GetAdminFacultiesApi,
  GetAdminSpecializationsApi,
  GetAdminUniversitiesApi,
  UpdateAdminFacultyApi,
  UpdateAdminSpecializationApi,
  UpdateAdminUniversityApi,
} from './api-docs';
import { AdminAcademicStructureService } from './admin-academic-structure.service';
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

@ApiTags('Admin')
@Controller('admin/academic-structure')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminAcademicStructureController {
  constructor(private readonly service: AdminAcademicStructureService) {}

  @GetAdminUniversitiesApi()
  @Get('universities')
  getUniversities(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Query() query: ListAcademicStructureQueryDto,
  ): Promise<AdminUniversityDto[]> {
    return this.service.getUniversities(actor, query);
  }

  @GetAdminFacultiesApi()
  @Get('universities/:universityId/faculties')
  getFaculties(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('universityId', ParseUUIDPipe) universityId: string,
    @Query() query: ListAcademicStructureQueryDto,
  ): Promise<AdminFacultyDto[]> {
    return this.service.getFaculties(actor, universityId, query);
  }

  @GetAdminSpecializationsApi()
  @Get('faculties/:facultyId/specializations')
  getSpecializations(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('facultyId', ParseUUIDPipe) facultyId: string,
    @Query() query: ListAcademicStructureQueryDto,
  ): Promise<AdminSpecializationDto[]> {
    return this.service.getSpecializations(actor, facultyId, query);
  }

  @CreateAdminUniversityApi()
  @Post('universities')
  createUniversity(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Body() dto: CreateUniversityDto,
  ): Promise<AdminUniversityDto> {
    return this.service.createUniversity(actor, dto);
  }

  @UpdateAdminUniversityApi()
  @Patch('universities/:universityId')
  updateUniversity(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('universityId', ParseUUIDPipe) universityId: string,
    @Body() dto: UpdateUniversityDto,
  ): Promise<AdminUniversityDto> {
    return this.service.updateUniversity(actor, universityId, dto);
  }

  @CreateAdminFacultyApi()
  @Post('faculties')
  createFaculty(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Body() dto: CreateFacultyDto,
  ): Promise<AdminFacultyDto> {
    return this.service.createFaculty(actor, dto);
  }

  @UpdateAdminFacultyApi()
  @Patch('faculties/:facultyId')
  updateFaculty(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('facultyId', ParseUUIDPipe) facultyId: string,
    @Body() dto: UpdateFacultyDto,
  ): Promise<AdminFacultyDto> {
    return this.service.updateFaculty(actor, facultyId, dto);
  }

  @CreateAdminSpecializationApi()
  @Post('specializations')
  createSpecialization(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Body() dto: CreateSpecializationDto,
  ): Promise<AdminSpecializationDto> {
    return this.service.createSpecialization(actor, dto);
  }

  @UpdateAdminSpecializationApi()
  @Patch('specializations/:specializationId')
  updateSpecialization(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('specializationId', ParseUUIDPipe) specializationId: string,
    @Body() dto: UpdateSpecializationDto,
  ): Promise<AdminSpecializationDto> {
    return this.service.updateSpecialization(actor, specializationId, dto);
  }

  @DeleteAdminUniversityApi()
  @Delete('universities/:universityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUniversity(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('universityId', ParseUUIDPipe) universityId: string,
  ): Promise<void> {
    await this.service.deleteUniversity(actor, universityId);
  }

  @DeleteAdminFacultyApi()
  @Delete('faculties/:facultyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFaculty(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('facultyId', ParseUUIDPipe) facultyId: string,
  ): Promise<void> {
    await this.service.deleteFaculty(actor, facultyId);
  }

  @DeleteAdminSpecializationApi()
  @Delete('specializations/:specializationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSpecialization(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('specializationId', ParseUUIDPipe) specializationId: string,
  ): Promise<void> {
    await this.service.deleteSpecialization(actor, specializationId);
  }
}

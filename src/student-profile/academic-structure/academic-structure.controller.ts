import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  GetFacultiesApi,
  GetSpecializationsApi,
  GetUniversitiesApi,
} from '../api-docs';
import {
  FacultyLookupDto,
  SpecializationLookupDto,
  UniversityLookupDto,
} from './dto/academic-structure.dto';
import { UniversitiesQueryDto } from './dto/universities-query.dto';
import { AcademicStructureService } from './academic-structure.service';

@ApiTags('Academic Structure')
@UseGuards(JwtAuthGuard)
@Controller()
export class AcademicStructureController {
  constructor(private readonly service: AcademicStructureService) {}

  @GetUniversitiesApi()
  @Get('universities')
  getUniversities(
    @Query() query: UniversitiesQueryDto,
  ): Promise<UniversityLookupDto[]> {
    return this.service.getUniversities(query);
  }

  @GetFacultiesApi()
  @Get('universities/:universityId/faculties')
  getFaculties(
    @Param('universityId', ParseUUIDPipe) universityId: string,
  ): Promise<FacultyLookupDto[]> {
    return this.service.getFaculties(universityId);
  }

  @GetSpecializationsApi()
  @Get('faculties/:facultyId/specializations')
  getSpecializations(
    @Param('facultyId', ParseUUIDPipe) facultyId: string,
  ): Promise<SpecializationLookupDto[]> {
    return this.service.getSpecializations(facultyId);
  }
}

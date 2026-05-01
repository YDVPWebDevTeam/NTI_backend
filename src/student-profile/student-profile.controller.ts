import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  CompleteProfileApi,
  GetMyProfileApi,
  UpdateAcademicInformationApi,
  UpdateProfessionalSkillsApi,
} from './api-docs';
import { GetMyStudentProfileResponseDto } from './dto/student-profile.dto';
import { UpdateAcademicInformationDto } from './dto/update-academic-information.dto';
import { UpdateProfessionalSkillsDto } from './dto/update-professional-skills.dto';
import { StudentProfileService } from './student-profile.service';

@ApiTags('Student Profile')
@Controller('student-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentProfileController {
  constructor(private readonly service: StudentProfileService) {}

  @GetMyProfileApi()
  @Get('me')
  getMyProfile(
    @GetUserContext() authUser: AuthenticatedUserContext,
  ): Promise<GetMyStudentProfileResponseDto> {
    return this.service.getMyProfile(authUser);
  }

  @UpdateAcademicInformationApi()
  @Patch('me/academic-information')
  updateAcademicInformation(
    @GetUserContext() authUser: AuthenticatedUserContext,
    @Body() dto: UpdateAcademicInformationDto,
  ): Promise<GetMyStudentProfileResponseDto> {
    return this.service.updateAcademicInformation(authUser, dto);
  }

  @UpdateProfessionalSkillsApi()
  @Patch('me/professional-skills')
  updateProfessionalSkills(
    @GetUserContext() authUser: AuthenticatedUserContext,
    @Body() dto: UpdateProfessionalSkillsDto,
  ): Promise<GetMyStudentProfileResponseDto> {
    return this.service.updateProfessionalSkills(authUser, dto);
  }

  @CompleteProfileApi()
  @Post('me/complete')
  @HttpCode(HttpStatus.OK)
  completeProfile(
    @GetUserContext() authUser: AuthenticatedUserContext,
  ): Promise<GetMyStudentProfileResponseDto> {
    return this.service.completeProfile(authUser);
  }
}

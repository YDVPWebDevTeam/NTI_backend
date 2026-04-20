import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import {
  FacultyLookupDto,
  SpecializationLookupDto,
  UniversityLookupDto,
} from '../academic-structure/dto/academic-structure.dto';
import { GetMyStudentProfileResponseDto } from '../dto/student-profile.dto';
import { UpdateAcademicInformationDto } from '../dto/update-academic-information.dto';
import { UpdateProfessionalSkillsDto } from '../dto/update-professional-skills.dto';

export const GetMyProfileApi = () =>
  createApiDecorator({
    summary: 'Get my student profile',
    description:
      'Returns profile completion status and profile data for the authenticated student.',
    successResponse: {
      status: 200,
      type: GetMyStudentProfileResponseDto,
      description: 'Student profile snapshot.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only users with STUDENT role can access this endpoint.',
      }),
      ApiNotFoundResponse({
        description: 'User not found.',
      }),
    ],
  });

export const UpdateAcademicInformationApi = () =>
  createApiDecorator({
    summary: 'Update academic information',
    description:
      'Creates or updates academic section of the student profile and validates selected hierarchy values.',
    body: UpdateAcademicInformationDto,
    successResponse: {
      status: 200,
      type: GetMyStudentProfileResponseDto,
      description: 'Updated student profile snapshot.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only users with STUDENT role can access this endpoint.',
      }),
      ApiBadRequestResponse({
        description:
          'Hierarchy validation failed, or attached file is invalid for current user.',
      }),
      ApiUnprocessableEntityResponse({
        description: 'Academic declaration must be accepted.',
      }),
    ],
  });

export const UpdateProfessionalSkillsApi = () =>
  createApiDecorator({
    summary: 'Update professional skills',
    description:
      'Replaces professional profile section, including skills and optional projects.',
    body: UpdateProfessionalSkillsDto,
    successResponse: {
      status: 200,
      type: GetMyStudentProfileResponseDto,
      description: 'Updated student profile snapshot.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only users with STUDENT role can access this endpoint.',
      }),
      ApiBadRequestResponse({
        description: 'Attached CV file is invalid for current user.',
      }),
      ApiUnprocessableEntityResponse({
        description:
          'Academic information is incomplete or no primary skill was provided.',
      }),
    ],
  });

export const CompleteProfileApi = () =>
  createApiDecorator({
    summary: 'Mark profile as complete',
    description:
      'Marks profile as complete when required academic and professional sections are filled.',
    successResponse: {
      status: 200,
      type: GetMyStudentProfileResponseDto,
      description: 'Completed student profile snapshot.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only users with STUDENT role can access this endpoint.',
      }),
      ApiUnprocessableEntityResponse({
        description: 'Profile is incomplete.',
      }),
    ],
  });

export const GetUniversitiesApi = () =>
  createApiDecorator({
    summary: 'List universities',
    description:
      'Returns universities filtered by optional search and activity flag.',
    successResponse: {
      status: 200,
      type: UniversityLookupDto,
      isArray: true,
      description: 'University lookup entries.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Case-insensitive search by university name or shortName.',
      }),
      ApiQuery({
        name: 'activeOnly',
        required: false,
        type: Boolean,
        description: 'When omitted, activeOnly=true is applied.',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiBadRequestResponse({
        description: 'Query parameters are invalid.',
      }),
    ],
  });

export const GetFacultiesApi = () =>
  createApiDecorator({
    summary: 'List faculties by university',
    description: 'Returns active faculties for the selected university.',
    successResponse: {
      status: 200,
      type: FacultyLookupDto,
      isArray: true,
      description: 'Faculty lookup entries.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'universityId',
        description: 'University identifier.',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiBadRequestResponse({
        description: 'University identifier must be a valid UUID.',
      }),
    ],
  });

export const GetSpecializationsApi = () =>
  createApiDecorator({
    summary: 'List specializations by faculty',
    description: 'Returns active specializations for the selected faculty.',
    successResponse: {
      status: 200,
      type: SpecializationLookupDto,
      isArray: true,
      description: 'Specialization lookup entries.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'facultyId',
        description: 'Faculty identifier.',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiBadRequestResponse({
        description: 'Faculty identifier must be a valid UUID.',
      }),
    ],
  });

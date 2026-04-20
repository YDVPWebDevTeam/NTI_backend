import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../../infrastructure/api-docs/api-docs-factory';
import {
  AdminFacultyDto,
  AdminSpecializationDto,
  AdminUniversityDto,
} from '../dto/admin-academic-structure-response.dto';
import { CreateFacultyDto, UpdateFacultyDto } from '../dto/upsert-faculty.dto';
import {
  CreateSpecializationDto,
  UpdateSpecializationDto,
} from '../dto/upsert-specialization.dto';
import {
  CreateUniversityDto,
  UpdateUniversityDto,
} from '../dto/upsert-university.dto';

export const GetAdminUniversitiesApi = () =>
  createApiDecorator({
    summary: 'List universities (admin)',
    description:
      'Returns universities for administrators. Use includeInactive=true to include inactive records.',
    successResponse: {
      status: 200,
      type: AdminUniversityDto,
      isArray: true,
      description: 'University records were fetched successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Case-insensitive search by name.',
      }),
      ApiQuery({
        name: 'includeInactive',
        required: false,
        type: Boolean,
        description: 'When true, inactive records are included.',
      }),
    ],
    errors: [
      ApiBadRequestResponse({ description: 'Query parameters are invalid.' }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can access academic structure.',
      }),
    ],
  });

export const GetAdminFacultiesApi = () =>
  createApiDecorator({
    summary: 'List faculties (admin)',
    description:
      'Returns faculties under a university for administrators. Use includeInactive=true to include inactive records.',
    successResponse: {
      status: 200,
      type: AdminFacultyDto,
      isArray: true,
      description: 'Faculty records were fetched successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({ name: 'universityId', description: 'University identifier.' }),
      ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Reserved for future filtering support.',
      }),
      ApiQuery({
        name: 'includeInactive',
        required: false,
        type: Boolean,
        description: 'When true, inactive records are included.',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Path/query parameters are invalid.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can access academic structure.',
      }),
      ApiNotFoundResponse({ description: 'University not found.' }),
    ],
  });

export const GetAdminSpecializationsApi = () =>
  createApiDecorator({
    summary: 'List specializations (admin)',
    description:
      'Returns specializations under a faculty for administrators. Use includeInactive=true to include inactive records.',
    successResponse: {
      status: 200,
      type: AdminSpecializationDto,
      isArray: true,
      description: 'Specialization records were fetched successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({ name: 'facultyId', description: 'Faculty identifier.' }),
      ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Reserved for future filtering support.',
      }),
      ApiQuery({
        name: 'includeInactive',
        required: false,
        type: Boolean,
        description: 'When true, inactive records are included.',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Path/query parameters are invalid.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can access academic structure.',
      }),
      ApiNotFoundResponse({ description: 'Faculty not found.' }),
    ],
  });

export const CreateAdminUniversityApi = () =>
  createApiDecorator({
    summary: 'Create university (admin)',
    description: 'Creates a university record.',
    body: CreateUniversityDto,
    successResponse: {
      status: 201,
      type: AdminUniversityDto,
      description: 'University was created successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiBadRequestResponse({
        description:
          'Request body is invalid or university unique constraints are violated.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can manage academic structure.',
      }),
    ],
  });

export const UpdateAdminUniversityApi = () =>
  createApiDecorator({
    summary: 'Update university (admin)',
    description: 'Updates selected university fields.',
    body: UpdateUniversityDto,
    successResponse: {
      status: 200,
      type: AdminUniversityDto,
      description: 'University was updated successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({ name: 'universityId', description: 'University identifier.' }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Path/body is invalid or university unique constraints are violated.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can manage academic structure.',
      }),
      ApiNotFoundResponse({ description: 'University not found.' }),
    ],
  });

export const CreateAdminFacultyApi = () =>
  createApiDecorator({
    summary: 'Create faculty (admin)',
    description: 'Creates a faculty record under a university.',
    body: CreateFacultyDto,
    successResponse: {
      status: 201,
      type: AdminFacultyDto,
      description: 'Faculty was created successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiBadRequestResponse({
        description:
          'Request body is invalid or faculty unique constraints are violated.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can manage academic structure.',
      }),
      ApiNotFoundResponse({ description: 'University not found.' }),
    ],
  });

export const UpdateAdminFacultyApi = () =>
  createApiDecorator({
    summary: 'Update faculty (admin)',
    description: 'Updates selected faculty fields.',
    body: UpdateFacultyDto,
    successResponse: {
      status: 200,
      type: AdminFacultyDto,
      description: 'Faculty was updated successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({ name: 'facultyId', description: 'Faculty identifier.' }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Path/body is invalid or faculty unique constraints are violated.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can manage academic structure.',
      }),
      ApiNotFoundResponse({
        description: 'Faculty not found, or selected university not found.',
      }),
    ],
  });

export const CreateAdminSpecializationApi = () =>
  createApiDecorator({
    summary: 'Create specialization (admin)',
    description: 'Creates a specialization record under a faculty.',
    body: CreateSpecializationDto,
    successResponse: {
      status: 201,
      type: AdminSpecializationDto,
      description: 'Specialization was created successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiBadRequestResponse({
        description:
          'Request body is invalid or specialization unique constraints are violated.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can manage academic structure.',
      }),
      ApiNotFoundResponse({ description: 'Faculty not found.' }),
    ],
  });

export const UpdateAdminSpecializationApi = () =>
  createApiDecorator({
    summary: 'Update specialization (admin)',
    description: 'Updates selected specialization fields.',
    body: UpdateSpecializationDto,
    successResponse: {
      status: 200,
      type: AdminSpecializationDto,
      description: 'Specialization was updated successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'specializationId',
        description: 'Specialization identifier.',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Path/body is invalid or specialization unique constraints are violated.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can manage academic structure.',
      }),
      ApiNotFoundResponse({
        description: 'Specialization not found, or selected faculty not found.',
      }),
    ],
  });

export const DeleteAdminUniversityApi = () =>
  createApiDecorator({
    summary: 'Delete university (admin)',
    description: 'Deletes a university record.',
    successResponse: {
      status: 204,
      description: 'University was deleted successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({ name: 'universityId', description: 'University identifier.' }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'University cannot be deleted because it is referenced by existing data.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can manage academic structure.',
      }),
      ApiNotFoundResponse({ description: 'University not found.' }),
    ],
  });

export const DeleteAdminFacultyApi = () =>
  createApiDecorator({
    summary: 'Delete faculty (admin)',
    description: 'Deletes a faculty record.',
    successResponse: {
      status: 204,
      description: 'Faculty was deleted successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({ name: 'facultyId', description: 'Faculty identifier.' }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Faculty cannot be deleted because it is referenced by existing data.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can manage academic structure.',
      }),
      ApiNotFoundResponse({ description: 'Faculty not found.' }),
    ],
  });

export const DeleteAdminSpecializationApi = () =>
  createApiDecorator({
    summary: 'Delete specialization (admin)',
    description: 'Deletes a specialization record.',
    successResponse: {
      status: 204,
      description: 'Specialization was deleted successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'specializationId',
        description: 'Specialization identifier.',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Specialization cannot be deleted because it is referenced by existing data.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only administrators can manage academic structure.',
      }),
      ApiNotFoundResponse({ description: 'Specialization not found.' }),
    ],
  });

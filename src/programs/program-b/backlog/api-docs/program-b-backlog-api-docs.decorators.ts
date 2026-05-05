import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { BacklogItemStatus } from 'generated/prisma/enums';
import { createApiDecorator } from '../../../../infrastructure/api-docs/api-docs-factory';
import { CreateProgramBBacklogItemDto } from '../dto/create-program-b-backlog-item.dto';
import { GetProgramBBacklogResponseDto } from '../dto/get-program-b-backlog-response.dto';
import { ProgramBBacklogItemDto } from '../dto/program-b-backlog-item.dto';
import { UpdateProgramBBacklogItemDto } from '../dto/update-program-b-backlog-item.dto';

export const CreateProgramBBacklogItemApi = () =>
  createApiDecorator({
    summary: 'Create Program B backlog item',
    description:
      'Creates a draft Program B backlog item for the authenticated user organization.',
    body: CreateProgramBBacklogItemDto,
    successResponse: {
      status: 201,
      type: ProgramBBacklogItemDto,
      description: 'Backlog item was created successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Request body is invalid.' }),
      ApiForbiddenResponse({
        description:
          'Only company owner or company employee from an active organization may create backlog items.',
      }),
    ],
  });

export const UpdateProgramBBacklogItemApi = () =>
  createApiDecorator({
    summary: 'Update Program B backlog item draft',
    description:
      'Updates editable fields of a draft Program B backlog item within the authenticated user organization.',
    body: UpdateProgramBBacklogItemDto,
    successResponse: {
      status: 200,
      type: ProgramBBacklogItemDto,
      description: 'Backlog item was updated successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Backlog item identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Identifier is malformed or request body is invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only organization members from an active organization may update their own draft backlog items.',
      }),
      ApiNotFoundResponse({ description: 'Backlog item was not found.' }),
      ApiConflictResponse({
        description: 'Only draft backlog items may be updated.',
      }),
    ],
  });

export const DeleteProgramBBacklogItemApi = () =>
  createApiDecorator({
    summary: 'Delete Program B backlog item draft',
    description:
      'Deletes a draft Program B backlog item from the authenticated company owner organization.',
    successResponse: {
      status: 200,
      type: ProgramBBacklogItemDto,
      description: 'Backlog item was deleted successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Backlog item identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Identifier is malformed.' }),
      ApiForbiddenResponse({
        description:
          'Only company owners from an active organization may delete draft backlog items.',
      }),
      ApiNotFoundResponse({ description: 'Backlog item was not found.' }),
      ApiConflictResponse({
        description: 'Only draft backlog items may be deleted.',
      }),
    ],
  });

export const ListMyProgramBBacklogItemsApi = () =>
  createApiDecorator({
    summary: 'List my organization Program B backlog items',
    description:
      'Returns paginated Program B backlog items for the authenticated user organization across all internal statuses.',
    successResponse: {
      status: 200,
      type: GetProgramBBacklogResponseDto,
      description: 'Backlog items were retrieved successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiQuery({ name: 'status', required: false, enum: BacklogItemStatus }),
      ApiQuery({
        name: 'q',
        required: false,
        description:
          'Case-insensitive substring filter for title or description.',
      }),
      ApiQuery({
        name: 'page',
        required: false,
        description: 'Page number, defaults to 1.',
        example: 1,
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        description: 'Page size, defaults to 20 and cannot exceed 100.',
        example: 20,
      }),
      ApiQuery({
        name: 'sort',
        required: false,
        enum: ['updatedAt', 'createdAt', 'budget', 'title'],
      }),
      ApiQuery({
        name: 'order',
        required: false,
        enum: ['asc', 'desc'],
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Query parameters are invalid.' }),
      ApiForbiddenResponse({
        description:
          'Only company owner or company employee from an active organization may view backlog items.',
      }),
    ],
  });

export const PublishProgramBBacklogItemApi = () =>
  createApiDecorator({
    summary: 'Publish Program B backlog item',
    description:
      'Publishes a draft Program B backlog item after validating required publish fields and product owner organization membership.',
    successResponse: {
      status: 200,
      type: ProgramBBacklogItemDto,
      description: 'Backlog item was published successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Backlog item identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description:
          'Identifier is malformed or the backlog item is not ready to publish.',
      }),
      ApiForbiddenResponse({
        description:
          'Only company owners from an active organization may publish backlog items.',
      }),
      ApiNotFoundResponse({ description: 'Backlog item was not found.' }),
      ApiConflictResponse({
        description: 'Only draft backlog items may be published.',
      }),
    ],
  });

export const ArchiveProgramBBacklogItemApi = () =>
  createApiDecorator({
    summary: 'Archive Program B backlog item',
    description:
      'Archives a draft or published Program B backlog item from the authenticated company owner organization.',
    successResponse: {
      status: 200,
      type: ProgramBBacklogItemDto,
      description: 'Backlog item was archived successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Backlog item identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Identifier is malformed.' }),
      ApiForbiddenResponse({
        description:
          'Only company owners from an active organization may archive backlog items.',
      }),
      ApiNotFoundResponse({ description: 'Backlog item was not found.' }),
      ApiConflictResponse({
        description: 'Only draft or published backlog items may be archived.',
      }),
    ],
  });

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
import { createPaginationQueryDecorators } from '../../../../common/pagination';
import { createApiDecorator } from '../../../../infrastructure/api-docs/api-docs-factory';
import { ProgramBProjectDto } from '../../projects/dto/program-b-project.dto';
import { ProgramBTeamApplicationResponseDto } from '../../team-application/dto/team-application-response.dto';
import { BACKLOG_SORT_VALUES } from '../dto/get-program-b-backlog-query.dto';
import { ProgramBBacklogCandidatesResponseDto } from '../dto/program-b-backlog-candidates-response.dto';
import { CreateProgramBBacklogItemDto } from '../dto/create-program-b-backlog-item.dto';
import { GetProgramBBacklogResponseDto } from '../dto/get-program-b-backlog-response.dto';
import { ProgramBCandidateDecisionDto } from '../dto/program-b-candidate-decision.dto';
import { ProgramBBacklogItemDto } from '../dto/program-b-backlog-item.dto';
import { AssignProductOwnerDto } from '../dto/assign-product-owner.dto';
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
          'Only organization members from an active organization may update draft backlog items in their organization.',
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
      ...createPaginationQueryDecorators({
        sortValues: BACKLOG_SORT_VALUES,
        sortDescription: 'Sortable backlog fields.',
        defaultSort: 'updatedAt',
        defaultOrder: 'desc',
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

export const ListPublishedProgramBBacklogItemsApi = () =>
  createApiDecorator({
    summary: 'List published Program B backlog items',
    description:
      'Returns paginated published Program B backlog items available to authenticated students.',
    successResponse: {
      status: 200,
      type: GetProgramBBacklogResponseDto,
      description: 'Published backlog items were retrieved successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiQuery({
        name: 'q',
        required: false,
        description:
          'Case-insensitive substring filter for title or description.',
      }),
      ...createPaginationQueryDecorators({
        sortValues: BACKLOG_SORT_VALUES,
        sortDescription: 'Sortable published backlog fields.',
        defaultSort: 'updatedAt',
        defaultOrder: 'desc',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({ description: 'Query parameters are invalid.' }),
      ApiForbiddenResponse({
        description:
          'Only active student users may view published backlog items.',
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

export const ListProgramBBacklogCandidatesApi = () =>
  createApiDecorator({
    summary: 'List Program B backlog candidates',
    description:
      'Returns all candidate team applications linked to the specified backlog item for company-side review and selection.',
    successResponse: {
      status: 200,
      type: ProgramBBacklogCandidatesResponseDto,
      description: 'Candidates were retrieved successfully.',
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
          'Only company-side organization members from the same active organization may view backlog candidates.',
      }),
      ApiNotFoundResponse({ description: 'Backlog item was not found.' }),
    ],
  });

const candidateActionParams = [
  ApiBearerAuth('access-token'),
  ApiParam({
    name: 'id',
    description: 'Backlog item identifier.',
    format: 'uuid',
  }),
  ApiParam({
    name: 'applicationId',
    description: 'Program B candidate application identifier.',
    format: 'uuid',
  }),
] as const;

export const ShortlistProgramBBacklogCandidateApi = () =>
  createApiDecorator({
    summary: 'Shortlist Program B backlog candidate',
    description:
      'Moves a Program B candidate application from SUBMITTED to SHORTLISTED for the specified published backlog item.',
    body: ProgramBCandidateDecisionDto,
    successResponse: {
      status: 200,
      type: ProgramBTeamApplicationResponseDto,
      description: 'Candidate was shortlisted successfully.',
    },
    extraDecorators: [...candidateActionParams],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Identifiers are malformed or request body is invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only company-side organization members from the same active organization may shortlist candidates.',
      }),
      ApiNotFoundResponse({
        description: 'Backlog item or candidate application was not found.',
      }),
      ApiConflictResponse({
        description:
          'Only published non-archived backlog items accept decisions, and only SUBMITTED candidates may be shortlisted.',
      }),
    ],
  });

export const AcceptProgramBBacklogCandidateApi = () =>
  createApiDecorator({
    summary: 'Accept Program B backlog candidate',
    description:
      'Accepts one candidate application for the specified published backlog item and automatically rejects the remaining active candidates.',
    body: ProgramBCandidateDecisionDto,
    successResponse: {
      status: 200,
      type: ProgramBTeamApplicationResponseDto,
      description: 'Candidate was accepted successfully.',
    },
    extraDecorators: [...candidateActionParams],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Identifiers are malformed or request body is invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only company-side organization members from the same active organization may accept candidates.',
      }),
      ApiNotFoundResponse({
        description: 'Backlog item or candidate application was not found.',
      }),
      ApiConflictResponse({
        description:
          'Only published non-archived backlog items accept decisions, only SUBMITTED or SHORTLISTED candidates may be accepted, and only one accepted candidate may exist per backlog item.',
      }),
    ],
  });

export const RejectProgramBBacklogCandidateApi = () =>
  createApiDecorator({
    summary: 'Reject Program B backlog candidate',
    description:
      'Rejects one candidate application for the specified published backlog item.',
    body: ProgramBCandidateDecisionDto,
    successResponse: {
      status: 200,
      type: ProgramBTeamApplicationResponseDto,
      description: 'Candidate was rejected successfully.',
    },
    extraDecorators: [...candidateActionParams],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Identifiers are malformed or request body is invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only company-side organization members from the same active organization may reject candidates.',
      }),
      ApiNotFoundResponse({
        description: 'Backlog item or candidate application was not found.',
      }),
      ApiConflictResponse({
        description:
          'Only published non-archived backlog items accept decisions, and only SUBMITTED or SHORTLISTED candidates may be rejected.',
      }),
    ],
  });

export const CreateProgramBProjectFromCandidateApi = () =>
  createApiDecorator({
    summary: 'Create Program B project from accepted candidate',
    description:
      'Creates or returns an idempotent Program B delivery project for the accepted candidate of the specified backlog item.',
    successResponse: {
      status: 200,
      type: ProgramBProjectDto,
      description:
        'Program B project handoff record was returned successfully.',
    },
    extraDecorators: [...candidateActionParams],
    errors: [
      ApiUnauthorizedResponse({ description: 'Authentication is required.' }),
      ApiBadRequestResponse({
        description: 'Identifiers are malformed.',
      }),
      ApiForbiddenResponse({
        description:
          'Only company-side organization members from the same active organization may create a project handoff.',
      }),
      ApiNotFoundResponse({
        description: 'Backlog item or candidate application was not found.',
      }),
      ApiConflictResponse({
        description:
          'Project handoff is allowed only for accepted candidates on non-archived backlog items with an active same-organization product owner.',
      }),
    ],
  });

export const AssignProductOwnerApi = () =>
  createApiDecorator({
    summary: 'Assign or reassign Product Owner for a backlog item',
    description:
      'Assigns or reassigns the Product Owner for an existing draft or published backlog item. Allowed for company owner (same organization), admin, and super admin.',
    body: AssignProductOwnerDto,
    successResponse: {
      status: 200,
      type: ProgramBBacklogItemDto,
      description: 'Product Owner was assigned successfully.',
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
          'Actor is not allowed to assign Product Owner, or target user is not an active member of the same organization.',
      }),
      ApiNotFoundResponse({
        description: 'Backlog item or target user was not found.',
      }),
      ApiConflictResponse({
        description:
          'Product Owner cannot be assigned to an archived backlog item.',
      }),
    ],
  });

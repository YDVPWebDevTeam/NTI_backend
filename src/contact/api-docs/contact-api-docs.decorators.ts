import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { ContactSubmissionDto } from '../dto/contact-submission.dto';
import { CreateContactSubmissionDto } from '../dto/create-contact-submission.dto';
import { UpdateContactStatusDto } from '../dto/update-contact-status.dto';

export const CreateContactSubmissionApi = () =>
  createApiDecorator({
    summary: 'Submit a contact inquiry',
    description: 'Public endpoint — no authentication required.',
    body: { type: CreateContactSubmissionDto },
    successResponse: {
      status: 201,
      type: ContactSubmissionDto,
      description: 'Submission persisted.',
    },
    errors: [ApiBadRequestResponse({ description: 'Validation error.' })],
  });

export const ListContactSubmissionsApi = () =>
  createApiDecorator({
    summary: 'List all contact submissions (admin)',
    successResponse: {
      status: 200,
      type: ContactSubmissionDto,
      isArray: true,
      description: 'Paginated list of submissions.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({ description: 'Not authenticated.' }),
      ApiForbiddenResponse({ description: 'Admin role required.' }),
    ],
  });

export const UpdateContactStatusApi = () =>
  createApiDecorator({
    summary: 'Update submission status (admin)',
    body: { type: UpdateContactStatusDto },
    successResponse: {
      status: 200,
      type: ContactSubmissionDto,
      description: 'Updated submission.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiBadRequestResponse({ description: 'Validation error.' }),
      ApiUnauthorizedResponse({ description: 'Not authenticated.' }),
      ApiForbiddenResponse({ description: 'Admin role required.' }),
      ApiNotFoundResponse({ description: 'Submission not found.' }),
    ],
  });

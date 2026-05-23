import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { AccountMessageResponseDto } from '../dto/account-message-response.dto';
import { ChangeEmailConfirmDto } from '../dto/change-email-confirm.dto';
import { ChangeEmailRequestDto } from '../dto/change-email-request.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

const authDecorators = [
  ApiCookieAuth('access-token-cookie'),
  ApiBearerAuth('access-token'),
];

export const ChangeMyPasswordApi = () =>
  createApiDecorator({
    operationId: 'changeMyPassword',
    summary: 'Change my password',
    description:
      'Validates the current password, updates the password hash, and revokes all active refresh sessions for the authenticated user.',
    body: ChangePasswordDto,
    successResponse: {
      status: 200,
      type: AccountMessageResponseDto,
      description:
        'Password was changed successfully and all active refresh sessions were revoked.',
    },
    extraDecorators: authDecorators,
    errors: [
      ApiBadRequestResponse({
        description:
          'Current password is incorrect, new password matches the current password, or the payload is invalid.',
      }),
      ApiUnauthorizedResponse({
        description: 'Access token is missing, expired, or invalid.',
      }),
      ApiTooManyRequestsResponse({
        description: 'Too many password change attempts. Try again later.',
      }),
    ],
  });

export const RequestMyEmailChangeApi = () =>
  createApiDecorator({
    operationId: 'requestMyEmailChange',
    summary: 'Request my email change',
    description:
      'Creates or replaces a pending email-change token for the authenticated user and sends a confirmation link to the new email address.',
    body: ChangeEmailRequestDto,
    successResponse: {
      status: 200,
      type: AccountMessageResponseDto,
      description:
        'Email change confirmation instructions were sent to the new email address.',
    },
    extraDecorators: authDecorators,
    errors: [
      ApiBadRequestResponse({
        description:
          'The new email is the same as the current email or the payload is invalid.',
      }),
      ApiConflictResponse({
        description:
          'Another account already uses the requested email address.',
      }),
      ApiUnauthorizedResponse({
        description: 'Access token is missing, expired, or invalid.',
      }),
      ApiTooManyRequestsResponse({
        description: 'Too many email change requests. Try again later.',
      }),
    ],
  });

export const ConfirmMyEmailChangeApi = () =>
  createApiDecorator({
    operationId: 'confirmMyEmailChange',
    summary: 'Confirm my email change',
    description:
      'Consumes a single-use email-change token, updates the authenticated user email, and revokes all active refresh sessions for that account.',
    body: ChangeEmailConfirmDto,
    successResponse: {
      status: 200,
      type: AccountMessageResponseDto,
      description:
        'Email was changed successfully and all active refresh sessions were revoked.',
    },
    extraDecorators: authDecorators,
    errors: [
      ApiBadRequestResponse({
        description:
          'Email change token is invalid, expired, used, or malformed.',
      }),
      ApiConflictResponse({
        description:
          'Another account claimed the new email address before confirmation completed.',
      }),
      ApiUnauthorizedResponse({
        description: 'Access token is missing, expired, or invalid.',
      }),
      ApiTooManyRequestsResponse({
        description: 'Too many email change confirmations. Try again later.',
      }),
    ],
  });

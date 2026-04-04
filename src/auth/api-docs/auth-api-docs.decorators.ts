import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { AuthenticatedUserDto } from '../dto/authenticated-user.dto';
import { ConfirmEmailDto } from '../dto/confirm-email.dto';
import { LoginDto } from '../dto/login.dto';
import { LogoutResponseDto } from '../dto/logout-response.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResendEmailDto } from '../dto/resend-email.dto';
import { RegisterCompanyOwnerDto } from '../dto/register-company-owner.dto';

export const RegisterApi = () =>
  createApiDecorator({
    summary: 'Register a new user',
    description:
      'Creates a new account, sends an email verification link, and returns the authenticated user context. The account will be created with a pending status until the email is confirmed.',
    body: RegisterDto,
    successResponse: {
      status: 201,
      type: AuthenticatedUserDto,
      description:
        'User was created successfully and email verification was sent.',
    },
    errors: [
      ApiConflictResponse({
        description: 'A user with this email already exists.',
      }),
    ],
  });

export const RegisterCompanyOwnerApi = () =>
  createApiDecorator({
    summary: 'Register a new company owner',
    description:
      'Creates a new account, sends an email verification link, and returns the authenticated user context. The account will be created with a pending status until the email is confirmed.',
    body: RegisterCompanyOwnerDto,
    successResponse: {
      status: 201,
      type: AuthenticatedUserDto,
      description:
        'User was created successfully and email verification was sent.',
    },
    errors: [
      ApiConflictResponse({
        description: 'A user with this email already exists.',
      }),
    ],
  });

export const LoginApi = () =>
  createApiDecorator({
    summary: 'Log in',
    description:
      'Authenticates the user, returns an access token, and writes the refresh token into an HttpOnly cookie.',
    body: LoginDto,
    successResponse: {
      status: 200,
      type: AuthResponseDto,
      description:
        'Authentication succeeded. The refresh token is returned via the `refreshToken` cookie.',
    },
    errors: [
      ApiUnauthorizedResponse({
        description:
          'Credentials are invalid or the account cannot authenticate.',
      }),
    ],
  });

export const MeApi = () =>
  createApiDecorator({
    summary: 'Get current user',
    description:
      'Returns the current authenticated user using the Bearer access token.',
    successResponse: {
      status: 200,
      type: AuthenticatedUserDto,
      description: 'Current authenticated user.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
    ],
  });

export const RefreshApi = () =>
  createApiDecorator({
    summary: 'Refresh access token',
    description:
      'Uses the HttpOnly `refreshToken` cookie to rotate the refresh token and issue a new access token.',
    successResponse: {
      status: 200,
      type: AuthResponseDto,
      description:
        'Tokens were refreshed successfully. A new refresh token is returned via the `refreshToken` cookie.',
    },
    extraDecorators: [ApiCookieAuth('refresh-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Refresh cookie is missing, expired, revoked, or invalid.',
      }),
    ],
  });

export const LogoutApi = () =>
  createApiDecorator({
    summary: 'Log out',
    description:
      'Revokes the current refresh token and clears the `refreshToken` cookie.',
    successResponse: {
      status: 200,
      type: LogoutResponseDto,
      description: 'Logout completed and the refresh cookie was cleared.',
    },
    extraDecorators: [ApiCookieAuth('refresh-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Refresh cookie is missing or invalid.',
      }),
    ],
  });

export const ConfirmEmailApi = () =>
  createApiDecorator({
    summary: 'Confirm email',
    description:
      "Confirms the user's email address using the verification token.",
    successResponse: {
      status: 200,
      type: AuthResponseDto,
      description: 'Email was confirmed successfully.',
    },
    body: ConfirmEmailDto,
    errors: [
      ApiBadRequestResponse({
        description: 'Verification token is missing, expired, or invalid.',
      }),
    ],
  });

export const ResendConfirmationEmailApi = () =>
  createApiDecorator({
    summary: 'Resend confirmation email',
    description:
      'Sends a new email verification token to the specified email address.',
    body: ResendEmailDto,
    successResponse: {
      status: 200,
      description: 'Confirmation email sent successfully.',
    },
  });

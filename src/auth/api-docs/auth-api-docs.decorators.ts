import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { AdminLoginResponseDto } from '../dto/admin-login-response.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { AuthenticatedUserDto } from '../dto/authenticated-user.dto';
import { ConfirmEmailDto } from '../dto/confirm-email.dto';
import { ForceChangePasswordDto } from '../dto/force-change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { LogoutResponseDto } from '../dto/logout-response.dto';
import { MessageResponseDto } from '../dto/message-response.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ResendEmailDto } from '../dto/resend-email.dto';
import { RegisterCompanyOwnerDto } from '../dto/register-company-owner.dto';
import { RegisterViaInviteDto } from '../dto/register-via-invite.dto';
import { RegisterViaInviteResponseDto } from '../dto/register-via-invite-response.dto';

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

export const RegisterViaInviteApi = () =>
  createApiDecorator({
    summary: 'Register via invite',
    description:
      'Creates a confirmed user account from a valid invitation token, joins the invited team, and marks the invitation as accepted.',
    body: RegisterViaInviteDto,
    successResponse: {
      status: 201,
      type: RegisterViaInviteResponseDto,
      description: 'Invited user was registered successfully.',
    },
    errors: [
      ApiNotFoundResponse({
        description: 'Invitation token was not found.',
      }),
      ApiBadRequestResponse({
        description:
          'Invitation token is expired, revoked, or already accepted.',
      }),
      ApiConflictResponse({
        description: 'A user with the invited email already exists.',
      }),
    ],
  });

export const LoginApi = () =>
  createApiDecorator({
    summary: 'Log in',
    description:
      'Authenticates non-admin users and writes both access and refresh tokens into HttpOnly cookies. Admin accounts must use `/auth/admin/login`.',
    body: LoginDto,
    successResponse: {
      status: 200,
      type: AuthResponseDto,
      description:
        'Authentication succeeded. Access and refresh tokens are returned via `accessToken` and `refreshToken` cookies.',
    },
    errors: [
      ApiUnauthorizedResponse({
        description:
          'Credentials are invalid, account cannot authenticate, or an admin account is used on this endpoint.',
      }),
    ],
  });

export const AdminLoginApi = () =>
  createApiDecorator({
    summary: 'Log in as admin',
    description:
      'Authenticates ADMIN or SUPER_ADMIN accounts. If password rotation is required, returns `requiresPasswordChange=true` and sets short-lived HttpOnly `requiresPasswordChangeToken` cookie instead of issuing session tokens.',
    body: LoginDto,
    successResponse: {
      status: 200,
      type: AdminLoginResponseDto,
      description:
        'Authentication succeeded or password-change challenge was returned.',
    },
    errors: [
      ApiUnauthorizedResponse({
        description:
          'Credentials are invalid, account cannot authenticate, or account is not an admin account.',
      }),
    ],
  });

export const ForceChangePasswordApi = () =>
  createApiDecorator({
    summary: 'Force change password',
    description:
      'Validates a short-lived password-change challenge token from HttpOnly `requiresPasswordChangeToken` cookie, updates password hash, clears forced-change flag, and issues normal auth tokens.',
    body: ForceChangePasswordDto,
    successResponse: {
      status: 200,
      type: AuthResponseDto,
      description:
        'Password was changed successfully. Access and refresh tokens are returned via `accessToken` and `refreshToken` cookies.',
    },
    errors: [
      ApiBadRequestResponse({
        description:
          'Password input is invalid or password confirmation does not match.',
      }),
      ApiUnauthorizedResponse({
        description: 'Password-change token is invalid, expired, or unusable.',
      }),
    ],
    extraDecorators: [ApiCookieAuth('password-change-token')],
  });

export const MeApi = () =>
  createApiDecorator({
    summary: 'Get current user',
    description:
      'Returns the current authenticated user using the `accessToken` cookie (or Bearer token for backward compatibility).',
    successResponse: {
      status: 200,
      type: AuthenticatedUserDto,
      description: 'Current authenticated user.',
    },
    extraDecorators: [
      ApiCookieAuth('access-token-cookie'),
      ApiBearerAuth('access-token'),
    ],
    errors: [
      ApiUnauthorizedResponse({
        description:
          'Access token is missing, expired, or invalid in cookie/Bearer auth.',
      }),
    ],
  });

export const RefreshApi = () =>
  createApiDecorator({
    summary: 'Refresh access token',
    description:
      'Uses the HttpOnly `refreshToken` cookie to rotate the refresh token and issue a new `accessToken` cookie.',
    successResponse: {
      status: 200,
      type: AuthResponseDto,
      description:
        'Tokens were refreshed successfully. New `accessToken` and `refreshToken` cookies were set.',
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
      'Revokes the current refresh token and clears `accessToken` and `refreshToken` cookies.',
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

export const ForgotPasswordApi = () =>
  createApiDecorator({
    summary: 'Request password reset',
    description:
      'Accepts an email address and, if the account exists, enqueues a password reset email without revealing whether the email is registered.',
    body: ForgotPasswordDto,
    successResponse: {
      status: 200,
      type: MessageResponseDto,
      description: 'Password reset request was accepted.',
    },
  });

export const ResetPasswordApi = () =>
  createApiDecorator({
    summary: 'Reset password',
    description:
      'Resets the account password using a valid password reset token and revokes all active refresh tokens for the user.',
    body: ResetPasswordDto,
    successResponse: {
      status: 200,
      type: MessageResponseDto,
      description: 'Password was reset successfully.',
    },
    errors: [
      ApiBadRequestResponse({
        description:
          'Password reset token is missing, expired, used, or invalid.',
      }),
    ],
  });

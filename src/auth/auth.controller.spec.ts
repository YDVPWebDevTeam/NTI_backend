jest.mock('../infrastructure/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('./auth.service', () => ({
  AuthService: class AuthService {},
}));

import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthCookieService } from './auth-cookie.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    registerViaInvite: jest.Mock;
    login: jest.Mock;
    adminLogin: jest.Mock;
    forceChangePassword: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(() => {
    authService = {
      registerViaInvite: jest.fn(),
      login: jest.fn(),
      adminLogin: jest.fn(),
      forceChangePassword: jest.fn(),
      logout: jest.fn(),
    };

    const authCookieService = new AuthCookieService({
      isProduction: false,
      jwtAccessExpiration: '15m',
      jwtRefreshExpirationDays: '7',
      forcePasswordChangeTokenExpirationMinutes: 15,
    } as never);

    controller = new AuthController(
      authService as unknown as AuthService,
      authCookieService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sets access and refresh token cookies and omits tokens from login response body', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'student@example.com',
        role: 'STUDENT',
        status: 'PENDING',
      },
    });

    const replyMock = {
      setCookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    const reply = replyMock as unknown as FastifyReply;

    const result = await controller.login(
      {
        email: 'student@example.com',
        password: 'strongpass123',
      },
      reply,
    );

    expect(replyMock.setCookie).toHaveBeenCalledWith(
      'accessToken',
      'access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
      }),
    );
    expect(replyMock.setCookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
      }),
    );
    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: 'student@example.com',
        role: 'STUDENT',
        status: 'PENDING',
      },
    });
  });

  it('delegates invite-based registration to the auth service', async () => {
    authService.registerViaInvite.mockResolvedValue({
      message: 'Registration via invite completed successfully.',
    });

    const result = await controller.registerViaInvite({
      firstName: 'Jan',
      lastName: 'Novak',
      token: 'invite-token',
      password: 'StrongPass123!',
    });

    expect(authService.registerViaInvite).toHaveBeenCalledWith({
      firstName: 'Jan',
      lastName: 'Novak',
      token: 'invite-token',
      password: 'StrongPass123!',
    });
    expect(result).toEqual({
      message: 'Registration via invite completed successfully.',
    });
  });

  it('clears refresh token cookie on logout', async () => {
    const replyMock = {
      clearCookie: jest.fn(),
    };
    const reply = replyMock as unknown as FastifyReply;
    const authUser: AuthenticatedUserContext = {
      id: 'user-1',
      email: 'student@example.com',
      role: 'STUDENT',
      status: 'PENDING',
      refreshTokenId: 'refresh-token-id',
    };

    const result = await controller.logout(authUser, reply);

    expect(authService.logout).toHaveBeenCalledWith('refresh-token-id');
    expect(replyMock.clearCookie).toHaveBeenCalledWith('refreshToken', {
      path: '/',
    });
    expect(replyMock.clearCookie).toHaveBeenCalledWith('accessToken', {
      path: '/',
    });
    expect(result).toEqual({ success: true });
  });

  it('does not set refresh cookie when password change is required', async () => {
    authService.adminLogin.mockResolvedValue({
      requiresPasswordChange: true,
      requiresPasswordChangeToken: 'temp-token',
    });
    const replyMock = {
      setCookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    const reply = replyMock as unknown as FastifyReply;

    const result = await controller.adminLogin(
      {
        email: 'admin@nti.sk',
        password: 'TempPass123!',
      },
      reply,
    );

    expect(replyMock.setCookie).toHaveBeenCalledWith(
      'requiresPasswordChangeToken',
      'temp-token',
      expect.objectContaining({
        httpOnly: true,
      }),
    );
    expect(replyMock.clearCookie).toHaveBeenCalledWith('refreshToken', {
      path: '/',
    });
    expect(replyMock.clearCookie).toHaveBeenCalledWith('accessToken', {
      path: '/',
    });
    expect(result).toEqual({
      requiresPasswordChange: true,
    });
  });

  it('sets refresh cookie after successful forced password change', async () => {
    authService.forceChangePassword.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'admin@nti.sk',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
    const replyMock = {
      setCookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    const reply = replyMock as unknown as FastifyReply;
    const request = {
      cookies: {
        requiresPasswordChangeToken: 'temp-token',
      },
    } as unknown as FastifyRequest;

    const result = await controller.forceChangePassword(
      {
        newPassword: 'NewStrongPass123!',
        confirmNewPassword: 'NewStrongPass123!',
      },
      request,
      reply,
    );

    expect(authService.forceChangePassword).toHaveBeenCalledWith(
      'temp-token',
      'NewStrongPass123!',
      'NewStrongPass123!',
    );
    expect(replyMock.setCookie).toHaveBeenCalledWith(
      'accessToken',
      'access-token',
      expect.objectContaining({
        httpOnly: true,
      }),
    );
    expect(replyMock.setCookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
      }),
    );
    expect(replyMock.clearCookie).toHaveBeenCalledWith(
      'requiresPasswordChangeToken',
      { path: '/' },
    );
    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: 'admin@nti.sk',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
  });

  it('rejects forced password change when challenge cookie is missing', async () => {
    const replyMock = {
      setCookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    const reply = replyMock as unknown as FastifyReply;
    const request = {
      cookies: {},
    } as unknown as FastifyRequest;

    await expect(
      controller.forceChangePassword(
        {
          newPassword: 'NewStrongPass123!',
          confirmNewPassword: 'NewStrongPass123!',
        },
        request,
        reply,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authService.forceChangePassword).not.toHaveBeenCalled();
  });
});

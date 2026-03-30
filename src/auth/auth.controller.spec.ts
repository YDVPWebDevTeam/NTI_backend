jest.mock('../infrastructure/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('./auth.service', () => ({
  AuthService: class AuthService {},
}));

import type { FastifyReply } from 'fastify';
import { ConfigService } from '../infrastructure/config';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    refreshTokenValidityDays: number;
    login: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(() => {
    authService = {
      refreshTokenValidityDays: 7,
      login: jest.fn(),
      logout: jest.fn(),
    };

    controller = new AuthController(
      authService as unknown as AuthService,
      {
        isProduction: false,
      } as unknown as ConfigService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sets refresh token cookie and omits it from login response body', async () => {
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
      'refreshToken',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
      }),
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        email: 'student@example.com',
        role: 'STUDENT',
        status: 'PENDING',
      },
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
    expect(result).toEqual({ success: true });
  });
});

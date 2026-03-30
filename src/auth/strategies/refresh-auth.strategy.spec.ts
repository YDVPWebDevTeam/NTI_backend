jest.mock('../../infrastructure/config/config.service', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('../../infrastructure/hashing', () => ({
  HashingService: class HashingService {},
}));

jest.mock('../../user/user.service', () => ({
  UserService: class UserService {},
}));

jest.mock('../refresh-token/refresh-token.service', () => ({
  RefreshTokenService: class RefreshTokenService {},
}));

import { UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { UserRole, UserStatus } from '../../../generated/prisma/enums';
import { HashingService } from '../../infrastructure/hashing';
import { ConfigService } from '../../infrastructure/config/config.service';
import { UserService } from '../../user/user.service';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';
import { RefreshJwtStrategy } from './refresh-auth.strategy';

describe('RefreshJwtStrategy', () => {
  let strategy: RefreshJwtStrategy;
  let userService: {
    findById: jest.Mock;
    bareSafeUser: jest.Mock;
  };
  let refreshTokenService: {
    findByTokenId: jest.Mock;
  };
  let hashingService: {
    verify: jest.Mock;
  };

  const user = {
    id: 'user-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.PENDING,
  };

  const refreshTokenRecord = {
    id: 'refresh-token-id',
    tokenHash: 'refresh-token-hash',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };

  beforeEach(() => {
    userService = {
      findById: jest.fn().mockResolvedValue(user),
      bareSafeUser: jest.fn().mockReturnValue(user),
    };
    refreshTokenService = {
      findByTokenId: jest.fn().mockResolvedValue(refreshTokenRecord),
    };
    hashingService = {
      verify: jest.fn().mockResolvedValue(true),
    };

    strategy = new RefreshJwtStrategy(
      userService as unknown as UserService,
      {
        jwtRefreshSecret: '1234567890123456',
      } as unknown as ConfigService,
      refreshTokenService as unknown as RefreshTokenService,
      hashingService as unknown as HashingService,
    );
  });

  it('returns authenticated user context for a valid refresh token', async () => {
    const req = {
      cookies: {
        refreshToken: 'refresh-token',
      },
    } as unknown as FastifyRequest;

    const result = await strategy.validate(req, {
      sub: user.id,
      email: user.email,
      refreshTokenId: 'refresh-token-id',
    });

    expect(hashingService.verify).toHaveBeenCalledWith(
      'refresh-token-hash',
      'refresh-token',
    );
    expect(result).toEqual({
      ...user,
      refreshTokenId: 'refresh-token-id',
    });
  });

  it('throws when refresh token has been revoked', async () => {
    refreshTokenService.findByTokenId.mockResolvedValue({
      ...refreshTokenRecord,
      revokedAt: new Date(),
    });

    const req = {
      cookies: {
        refreshToken: 'refresh-token',
      },
    } as unknown as FastifyRequest;

    await expect(
      strategy.validate(req, {
        sub: user.id,
        email: user.email,
        refreshTokenId: 'refresh-token-id',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

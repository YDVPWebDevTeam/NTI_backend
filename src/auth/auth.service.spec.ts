jest.mock('../user/user.service', () => ({
  UserService: class UserService {},
}));

jest.mock('../infrastructure/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('../infrastructure/hashing', () => ({
  HashingService: class HashingService {},
}));

jest.mock('./refresh-token/refresh-token.service', () => ({
  RefreshTokenService: class RefreshTokenService {},
}));

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import { ConfigService } from '../infrastructure/config';
import { HashingService } from '../infrastructure/hashing';
import { UserService } from '../user/user.service';
import { RefreshTokenService } from './refresh-token/refresh-token.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: {
    findByEmail: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    bareSafeUser: jest.Mock;
  };
  let refreshTokens: {
    create: jest.Mock;
    revokeById: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let hashingService: {
    hash: jest.Mock;
    verify: jest.Mock;
  };

  const user = {
    id: 'user-1',
    email: 'student@example.com',
    name: 'Student',
    passwordHash: 'stored-hash',
    role: UserRole.STUDENT,
    status: UserStatus.PENDING,
  };

  const safeUser = {
    id: 'user-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.PENDING,
  };

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      bareSafeUser: jest.fn().mockReturnValue(safeUser),
    };
    refreshTokens = {
      create: jest.fn(),
      revokeById: jest.fn(),
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    };
    hashingService = {
      hash: jest
        .fn()
        .mockResolvedValueOnce('password-hash')
        .mockResolvedValue('refresh-token-hash'),
      verify: jest.fn().mockResolvedValue(true),
    };

    service = new AuthService(
      users as unknown as UserService,
      refreshTokens as unknown as RefreshTokenService,
      jwtService as unknown as JwtService,
      hashingService as unknown as HashingService,
      {
        jwtRefreshSecret: '1234567890123456',
        jwtRefreshExpirationDays: '7d',
      } as unknown as ConfigService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers a user and returns tokens', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue(user);

    const result = await service.register({
      email: user.email,
      name: user.name,
      password: 'strongpass123',
    });

    expect(users.findByEmail).toHaveBeenCalledWith(user.email);
    expect(hashingService.hash).toHaveBeenNthCalledWith(1, 'strongpass123');
    expect(users.create).toHaveBeenCalledWith({
      email: user.email,
      name: user.name,
      passwordHash: 'password-hash',
    });
    expect(refreshTokens.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        tokenHash: 'refresh-token-hash',
      }),
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: safeUser,
    });
  });

  it('throws on register when email is already taken', async () => {
    users.findByEmail.mockResolvedValue(user);

    await expect(
      service.register({
        email: user.email,
        name: user.name,
        password: 'strongpass123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in a user and returns tokens', async () => {
    users.findByEmail.mockResolvedValue(user);

    const result = await service.login({
      email: user.email,
      password: 'strongpass123',
    });

    expect(hashingService.verify).toHaveBeenCalledWith(
      user.passwordHash,
      'strongpass123',
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: safeUser,
    });
  });

  it('throws on login when password is invalid', async () => {
    users.findByEmail.mockResolvedValue(user);
    hashingService.verify.mockResolvedValue(false);

    await expect(
      service.login({
        email: user.email,
        password: 'wrongpass123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes tokens and revokes the previous refresh token', async () => {
    users.findById.mockResolvedValue(user);

    const result = await service.refresh({
      ...safeUser,
      refreshTokenId: 'refresh-token-id',
    });

    expect(refreshTokens.revokeById).toHaveBeenCalledWith('refresh-token-id');
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: safeUser,
    });
  });

  it('throws on refresh when refresh token context is missing', async () => {
    await expect(service.refresh(safeUser)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

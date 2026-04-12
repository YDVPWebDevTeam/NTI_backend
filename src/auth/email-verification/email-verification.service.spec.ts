import { BadRequestException } from '@nestjs/common';
import type { EmailVerificationToken } from '../../../generated/prisma/client';
import type { PrismaDbClient } from '../../infrastructure/database';

jest.mock('../../infrastructure/config', () => ({
  ConfigService: class ConfigService {},
}));
jest.mock('../../infrastructure/hashing', () => ({
  HashingService: class HashingService {},
}));
jest.mock('./email-verification.repository', () => ({
  EmailVerificationRepository: class EmailVerificationRepository {},
}));

import { EmailVerificationService } from './email-verification.service';

describe('EmailVerificationService', () => {
  const validTokenRecord: EmailVerificationToken = {
    id: 'token-id',
    token: 'real-token',
    userId: 'user-id',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    acceptedAt: null,
  };

  function createService(overrides?: {
    isDevelopment?: boolean;
    bypassEnabled?: boolean;
    bypassToken?: string;
  }) {
    type EmailVerificationRepositoryMock = {
      findByToken: jest.MockedFunction<
        (
          token: string,
          db?: PrismaDbClient,
        ) => Promise<EmailVerificationToken | null>
      >;
      findMany: jest.MockedFunction<
        (
          args: {
            where: {
              acceptedAt: null;
              expiresAt: { gt: Date };
              user: { email: string };
            };
            orderBy: { createdAt: 'desc' };
            take: 1;
          },
          db?: PrismaDbClient,
        ) => Promise<EmailVerificationToken[]>
      >;
    };

    const repository = {
      findByToken: jest.fn<
        Promise<EmailVerificationToken | null>,
        [string, PrismaDbClient?]
      >(),
      findMany: jest.fn<
        Promise<EmailVerificationToken[]>,
        [
          {
            where: {
              acceptedAt: null;
              expiresAt: { gt: Date };
              user: { email: string };
            };
            orderBy: { createdAt: 'desc' };
            take: 1;
          },
          PrismaDbClient?,
        ]
      >(),
    } as EmailVerificationRepositoryMock;
    const configService = {
      isDevelopment: overrides?.isDevelopment ?? false,
      devEmailVerificationBypassEnabled: overrides?.bypassEnabled ?? false,
      devEmailVerificationBypassToken: overrides?.bypassToken,
      tokenByteLength: 32,
      emailVerificationExpirationHours: 24,
    };
    const hashingService = {
      generateHexToken: jest.fn(),
    };

    return {
      service: new EmailVerificationService(
        repository as never,
        configService as never,
        hashingService as never,
      ),
      repository,
    };
  }

  it('uses token lookup when bypass is not enabled', async () => {
    const { service, repository } = createService();
    repository.findByToken.mockResolvedValue(validTokenRecord);

    const result = await service.validateTokenOrThrow('real-token');

    expect(result).toEqual(validTokenRecord);
    expect(repository.findByToken).toHaveBeenCalledWith(
      'real-token',
      undefined,
    );
    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it('uses bypass lookup with token:email format', async () => {
    const { service, repository } = createService({
      isDevelopment: true,
      bypassEnabled: true,
      bypassToken: 'dev-bypass-token',
    });
    repository.findMany.mockResolvedValue([validTokenRecord]);

    const result = await service.validateTokenOrThrow(
      'dev-bypass-token:dev.user@example.com',
    );

    expect(result).toEqual(validTokenRecord);
    expect(repository.findByToken).not.toHaveBeenCalled();
    expect(repository.findMany).toHaveBeenCalledTimes(1);
    expect(repository.findMany.mock.calls[0][0]).toMatchObject({
      where: {
        acceptedAt: null,
        user: { email: 'dev.user@example.com' },
      },
      take: 1,
    });
  });

  it('supports dynamic dev bypass for any email via token suffix', async () => {
    const { service, repository } = createService({
      isDevelopment: true,
      bypassEnabled: true,
      bypassToken: 'dev-bypass-token',
    });
    repository.findMany.mockResolvedValue([validTokenRecord]);

    const result = await service.validateTokenOrThrow(
      'dev-bypass-token:any.user@example.com',
    );

    expect(result).toEqual(validTokenRecord);
    expect(repository.findByToken).not.toHaveBeenCalled();
    expect(repository.findMany).toHaveBeenCalledTimes(1);
    expect(repository.findMany.mock.calls[0][0]).toMatchObject({
      where: {
        acceptedAt: null,
        user: { email: 'any.user@example.com' },
      },
    });
  });

  it('supports email-as-token bypass in development', async () => {
    const { service, repository } = createService({
      isDevelopment: true,
      bypassEnabled: true,
    });
    repository.findMany.mockResolvedValue([validTokenRecord]);

    const result = await service.validateTokenOrThrow('Any.User@Example.com');

    expect(result).toEqual(validTokenRecord);
    expect(repository.findByToken).not.toHaveBeenCalled();
    expect(repository.findMany).toHaveBeenCalledTimes(1);
    expect(repository.findMany.mock.calls[0][0]).toMatchObject({
      where: {
        acceptedAt: null,
        user: { email: 'any.user@example.com' },
      },
    });
  });

  it('rejects plain bypass token when no real token exists', async () => {
    const { service, repository } = createService({
      isDevelopment: true,
      bypassEnabled: true,
      bypassToken: 'dev-bypass-token',
    });
    repository.findByToken.mockResolvedValue(null);

    await expect(
      service.validateTokenOrThrow('dev-bypass-token'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findMany).not.toHaveBeenCalled();
    expect(repository.findByToken).toHaveBeenCalledWith(
      'dev-bypass-token',
      undefined,
    );
  });
});

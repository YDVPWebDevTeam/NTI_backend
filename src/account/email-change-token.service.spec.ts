import type { EmailChangeToken } from '../../generated/prisma/client';
import type { PrismaDbClient } from '../infrastructure/database';

jest.mock('../infrastructure/config', () => ({
  ConfigService: class ConfigService {},
}));
jest.mock('../infrastructure/hashing', () => ({
  HashingService: class HashingService {},
}));
jest.mock('./email-change-token.repository', () => ({
  EmailChangeTokenRepository: class EmailChangeTokenRepository {},
}));

import { EmailChangeTokenService } from './email-change-token.service';

describe('EmailChangeTokenService', () => {
  const validTokenRecord: EmailChangeToken = {
    id: 'token-id',
    tokenHash: 'stored-token-hash',
    userId: 'user-id',
    newEmail: 'new.user@example.com',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    usedAt: null,
  };

  function createService(overrides?: {
    isDevelopment?: boolean;
    bypassEnabled?: boolean;
    bypassToken?: string;
  }) {
    type EmailChangeTokenRepositoryMock = {
      findMany: jest.MockedFunction<
        (
          args: {
            where: {
              usedAt: null;
              expiresAt: { gt: Date };
              newEmail: string;
            };
            orderBy: { createdAt: 'desc' };
            take: 1;
          },
          db?: PrismaDbClient,
        ) => Promise<EmailChangeToken[]>
      >;
      consumeByTokenHash: jest.MockedFunction<
        (
          tokenHash: string,
          usedAt?: Date,
          db?: PrismaDbClient,
        ) => Promise<EmailChangeToken | null>
      >;
    };

    const repository = {
      findMany: jest.fn<
        Promise<EmailChangeToken[]>,
        [
          {
            where: {
              usedAt: null;
              expiresAt: { gt: Date };
              newEmail: string;
            };
            orderBy: { createdAt: 'desc' };
            take: 1;
          },
          PrismaDbClient?,
        ]
      >(),
      consumeByTokenHash: jest.fn<
        Promise<EmailChangeToken | null>,
        [string, Date?, PrismaDbClient?]
      >(),
    } as EmailChangeTokenRepositoryMock;
    const configService = {
      isDevelopment: overrides?.isDevelopment ?? false,
      devEmailVerificationBypassEnabled: overrides?.bypassEnabled ?? false,
      devEmailVerificationBypassToken: overrides?.bypassToken,
      tokenByteLength: 32,
      emailVerificationExpirationHours: 24,
    };
    const hashingService = {
      hashToken: jest.fn((token: string) => `hashed:${token}`),
      generateHexToken: jest.fn(),
    };

    return {
      service: new EmailChangeTokenService(
        repository as never,
        configService as never,
        hashingService as never,
      ),
      repository,
      hashingService,
    };
  }

  it('uses hashed token lookup when bypass is not enabled', async () => {
    const { service, repository, hashingService } = createService();
    repository.consumeByTokenHash.mockResolvedValue(validTokenRecord);

    const result = await service.consumeByToken('real-token');

    expect(result).toEqual(validTokenRecord);
    expect(hashingService.hashToken).toHaveBeenCalledWith('real-token');
    expect(repository.consumeByTokenHash).toHaveBeenCalledWith(
      'hashed:real-token',
      expect.any(Date),
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
    repository.consumeByTokenHash.mockResolvedValue(validTokenRecord);

    const result = await service.consumeByToken(
      'dev-bypass-token:new.user@example.com',
    );

    expect(result).toEqual(validTokenRecord);
    expect(repository.findMany).toHaveBeenCalledTimes(1);
    expect(repository.findMany.mock.calls[0][0]).toMatchObject({
      where: {
        usedAt: null,
        newEmail: 'new.user@example.com',
      },
    });
    expect(repository.consumeByTokenHash).toHaveBeenCalledWith(
      'stored-token-hash',
      expect.any(Date),
      undefined,
    );
  });

  it('supports email-as-token bypass in development', async () => {
    const { service, repository } = createService({
      isDevelopment: true,
      bypassEnabled: true,
    });
    repository.findMany.mockResolvedValue([validTokenRecord]);
    repository.consumeByTokenHash.mockResolvedValue(validTokenRecord);

    const result = await service.consumeByToken('New.User@Example.com');

    expect(result).toEqual(validTokenRecord);
    expect(repository.findMany).toHaveBeenCalledTimes(1);
    expect(repository.findMany.mock.calls[0][0]).toMatchObject({
      where: {
        usedAt: null,
        newEmail: 'new.user@example.com',
      },
    });
  });

  it('falls back to normal token lookup for non-email bypass tokens', async () => {
    const { service, repository, hashingService } = createService({
      isDevelopment: true,
      bypassEnabled: true,
      bypassToken: 'dev-bypass-token',
    });
    repository.consumeByTokenHash.mockResolvedValue(null);

    await service.consumeByToken('dev-bypass-token');

    expect(repository.findMany).not.toHaveBeenCalled();
    expect(hashingService.hashToken).toHaveBeenCalledWith('dev-bypass-token');
    expect(repository.consumeByTokenHash).toHaveBeenCalledWith(
      'hashed:dev-bypass-token',
      expect.any(Date),
      undefined,
    );
  });
});

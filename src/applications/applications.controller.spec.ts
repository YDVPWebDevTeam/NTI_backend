jest.mock('./applications.service', () => ({
  ApplicationsService: class ApplicationsService {},
}));

jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let applicationsService: {
    createDraft: jest.Mock;
    findById: jest.Mock;
    listPublicCalls: jest.Mock;
    listActivePublicCalls: jest.Mock;
    findPublicCallById: jest.Mock;
  };

  beforeEach(() => {
    applicationsService = {
      createDraft: jest.fn().mockResolvedValue({ id: 'application-1' }),
      findById: jest.fn().mockResolvedValue({ id: 'application-1' }),
      listPublicCalls: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      listActivePublicCalls: jest
        .fn()
        .mockResolvedValue({ data: [], meta: {} }),
      findPublicCallById: jest.fn().mockResolvedValue({ id: 'call-1' }),
    };

    controller = new ApplicationsController(
      applicationsService as unknown as ApplicationsService,
    );
  });

  it('delegates draft creation to the applications service', async () => {
    const user = { id: 'user-1', email: 'lead@example.com' } as never;
    const dto = {
      callId: '87dcb0e9-2f7e-4ab5-b014-d2f1204bc138',
      teamId: '5db65d84-f9ae-4221-a4be-15e65e6d4d3c',
    };

    const result = await controller.createDraft(user, dto);

    expect(applicationsService.createDraft).toHaveBeenCalledWith(user, dto);
    expect(result).toEqual({ id: 'application-1' });
  });

  it('delegates public call listing to the applications service', async () => {
    const query = {
      page: 1,
      limit: 20,
      sort: 'closesAt',
      order: 'asc',
    } as const;

    await controller.listPublicCalls(query);

    expect(applicationsService.listPublicCalls).toHaveBeenCalledWith(query);
  });

  it('delegates active public call listing to the applications service', async () => {
    const query = {
      page: 1,
      limit: 20,
      sort: 'closesAt',
      order: 'asc',
      type: 'PROGRAM_A',
    } as const;

    await controller.listActivePublicCalls(query);

    expect(applicationsService.listActivePublicCalls).toHaveBeenCalledWith(
      query,
    );
  });

  it('delegates public call lookup by id to the applications service', async () => {
    await controller.findPublicCallById('f6c90688-c973-40ca-8f3b-c55667cc6f77');

    expect(applicationsService.findPublicCallById).toHaveBeenCalledWith(
      'f6c90688-c973-40ca-8f3b-c55667cc6f77',
    );
  });

  it('delegates lookup to the applications service with user context', async () => {
    const user = { id: 'user-1', email: 'user@example.com' } as never;
    const result = await controller.findById(
      'f6c90688-c973-40ca-8f3b-c55667cc6f77',
      user,
    );

    expect(applicationsService.findById).toHaveBeenCalledWith(
      'f6c90688-c973-40ca-8f3b-c55667cc6f77',
      user,
    );
    expect(result).toEqual({ id: 'application-1' });
  });
});

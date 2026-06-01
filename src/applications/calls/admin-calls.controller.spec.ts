jest.mock('./admin-calls.service', () => ({
  AdminCallsService: class AdminCallsService {},
}));

import { UserRole, UserStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { AdminCallsController } from './admin-calls.controller';
import { AdminCallsService } from './admin-calls.service';
import type { AdminCallsQueryDto } from '../dto/admin-calls-query.dto';

describe('AdminCallsController', () => {
  let controller: AdminCallsController;
  let adminCallsService: {
    createCall: jest.Mock;
    listCalls: jest.Mock;
    getCall: jest.Mock;
    updateCall: jest.Mock;
    openCall: jest.Mock;
    closeCall: jest.Mock;
    archiveCall: jest.Mock;
  };

  const actor: AuthenticatedUserContext = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    organizationId: null,
  };

  beforeEach(() => {
    adminCallsService = {
      createCall: jest.fn().mockResolvedValue({ id: 'call-1' }),
      listCalls: jest.fn().mockResolvedValue({
        data: [{ id: 'call-1' }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      getCall: jest.fn().mockResolvedValue({ id: 'call-1' }),
      updateCall: jest.fn().mockResolvedValue({ id: 'call-1' }),
      openCall: jest.fn().mockResolvedValue({ id: 'call-1' }),
      closeCall: jest.fn().mockResolvedValue({ id: 'call-1' }),
      archiveCall: jest.fn().mockResolvedValue({ id: 'call-1' }),
    };

    controller = new AdminCallsController(
      adminCallsService as unknown as AdminCallsService,
    );
  });

  it('delegates call creation', async () => {
    const dto = {
      type: 'PROGRAM_A',
      title: 'Spring 2026',
      requiredDocumentTypes: ['CV'],
    } as never;

    await controller.create(actor, dto);

    expect(adminCallsService.createCall).toHaveBeenCalledWith(actor, dto);
  });

  it('delegates call listing', async () => {
    const query: AdminCallsQueryDto = {
      page: 1,
      limit: 20,
      sort: 'createdAt',
      order: 'desc',
    };

    await controller.list(actor, query);

    expect(adminCallsService.listCalls).toHaveBeenCalledWith(actor, query);
  });

  it('delegates call detail fetch', async () => {
    await controller.getById(actor, 'call-1');

    expect(adminCallsService.getCall).toHaveBeenCalledWith(actor, 'call-1');
  });

  it('delegates call updates', async () => {
    const dto = { title: 'Updated title' };

    await controller.update(actor, 'call-1', dto);

    expect(adminCallsService.updateCall).toHaveBeenCalledWith(
      actor,
      'call-1',
      dto,
    );
  });

  it('delegates lifecycle actions', async () => {
    await controller.open(actor, 'call-1');
    await controller.close(actor, 'call-1');
    await controller.archive(actor, 'call-1');

    expect(adminCallsService.openCall).toHaveBeenCalledWith(actor, 'call-1');
    expect(adminCallsService.closeCall).toHaveBeenCalledWith(actor, 'call-1');
    expect(adminCallsService.archiveCall).toHaveBeenCalledWith(actor, 'call-1');
  });
});

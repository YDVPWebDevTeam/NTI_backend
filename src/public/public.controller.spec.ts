jest.mock('./public.service', () => ({
  PublicService: class PublicService {},
}));

import { PublicController } from './public.controller';
import { PublicService } from './public.service';

describe('PublicController', () => {
  let controller: PublicController;
  let publicService: {
    listPrograms: jest.Mock;
    listProgramCalls: jest.Mock;
    listActiveCalls: jest.Mock;
    findCallById: jest.Mock;
  };

  beforeEach(() => {
    publicService = {
      listPrograms: jest.fn().mockReturnValue([{ id: 'PROGRAM_A' }]),
      listProgramCalls: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      listActiveCalls: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findCallById: jest.fn().mockResolvedValue({ id: 'call-1' }),
    };

    controller = new PublicController(
      publicService as unknown as PublicService,
    );
  });

  it('delegates program listing to the service', () => {
    const result = controller.listPrograms();

    expect(publicService.listPrograms).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'PROGRAM_A' }]);
  });

  it('delegates program call listing to the service', async () => {
    const query = { page: 1, limit: 20, sort: 'closesAt:asc' } as const;

    await controller.listProgramCalls('program-a', query);

    expect(publicService.listProgramCalls).toHaveBeenCalledWith(
      'program-a',
      query,
    );
  });

  it('delegates active call listing to the service', async () => {
    const query = {
      page: 1,
      limit: 20,
      sort: 'closesAt:asc',
      programId: 'PROGRAM_A',
    } as const;

    await controller.listActiveCalls(query);

    expect(publicService.listActiveCalls).toHaveBeenCalledWith(query);
  });

  it('delegates call detail lookup to the service', async () => {
    await controller.findCallById('call-1');

    expect(publicService.findCallById).toHaveBeenCalledWith('call-1');
  });
});

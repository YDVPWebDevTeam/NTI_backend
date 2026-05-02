/* eslint-disable @typescript-eslint/no-unsafe-assignment */
jest.mock('../applications/calls.repository', () => ({
  CallsRepository: class CallsRepository {},
}));

import { NotFoundException } from '@nestjs/common';
import { CallStatus, ProgramType } from '../../generated/prisma/enums';
import { CallsRepository } from '../applications/calls.repository';
import { PublicService } from './public.service';

describe('PublicService', () => {
  let service: PublicService;

  let findPublicVisibleById: jest.Mocked<CallsRepository>['findPublicVisibleById'];
  let findPublicVisibleMany: jest.Mocked<CallsRepository>['findPublicVisibleMany'];
  let countPublicVisible: jest.Mocked<CallsRepository>['countPublicVisible'];

  const publicCall = {
    id: 'call-1',
    type: ProgramType.PROGRAM_A,
    title: 'Public Call',
    status: CallStatus.OPEN,
    opensAt: new Date('2030-01-01T00:00:00.000Z'),
    closesAt: new Date('2030-02-01T00:00:00.000Z'),
    createdAt: new Date('2029-12-01T00:00:00.000Z'),
    updatedAt: new Date('2029-12-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    findPublicVisibleById = jest.fn();
    findPublicVisibleMany = jest.fn();
    countPublicVisible = jest.fn();

    service = new PublicService({
      findPublicVisibleById,
      findPublicVisibleMany,
      countPublicVisible,
    } as unknown as CallsRepository);
  });

  it('returns public program catalog', () => {
    expect(service.listPrograms()).toEqual([
      {
        id: ProgramType.PROGRAM_A,
        code: ProgramType.PROGRAM_A,
        slug: 'program-a',
        label: 'Program A',
      },
      {
        id: ProgramType.PROGRAM_B,
        code: ProgramType.PROGRAM_B,
        slug: 'program-b',
        label: 'Program B',
      },
    ]);
  });

  it('returns a public call by id', async () => {
    findPublicVisibleById.mockResolvedValue(publicCall);

    await expect(service.findCallById('call-1')).resolves.toEqual({
      id: 'call-1',
      programId: ProgramType.PROGRAM_A,
      type: ProgramType.PROGRAM_A,
      title: 'Public Call',
      status: CallStatus.OPEN,
      opensAt: publicCall.opensAt,
      closesAt: publicCall.closesAt,
    });

    expect(findPublicVisibleById).toHaveBeenCalledWith(
      'call-1',
      expect.any(Date),
    );
  });

  it('throws not found when public call does not exist', async () => {
    findPublicVisibleById.mockResolvedValue(null);

    await expect(service.findCallById('call-404')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists active calls with program filter and pagination', async () => {
    findPublicVisibleMany.mockResolvedValue([publicCall]);
    countPublicVisible.mockResolvedValue(1);

    await expect(
      service.listActiveCalls({
        page: 1,
        limit: 10,
        sort: 'closesAt:asc',
        programId: 'program-a',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    );

    expect(findPublicVisibleMany).toHaveBeenCalledWith({
      now: expect.any(Date),
      programType: ProgramType.PROGRAM_A,
      skip: 0,
      take: 10,
      orderBy: [{ closesAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(countPublicVisible).toHaveBeenCalledWith({
      now: expect.any(Date),
      programType: ProgramType.PROGRAM_A,
    });
  });

  it('lists calls for a resolved program id', async () => {
    findPublicVisibleMany.mockResolvedValue([publicCall]);
    countPublicVisible.mockResolvedValue(1);

    await service.listProgramCalls('PROGRAM_A', {
      page: 1,
      limit: 20,
      sort: 'createdAt:desc',
    });

    expect(findPublicVisibleMany).toHaveBeenCalledWith({
      now: expect.any(Date),
      programType: ProgramType.PROGRAM_A,
      skip: 0,
      take: 20,
      orderBy: [{ createdAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });
  });

  it('throws not found for unknown program id', async () => {
    await expect(
      service.listProgramCalls('unknown-program', {
        page: 1,
        limit: 20,
        sort: 'closesAt:asc',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

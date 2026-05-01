jest.mock('./calls.repository', () => ({
  CallsRepository: class CallsRepository {},
}));

jest.mock('../team/team.repository', () => ({
  TeamRepository: class TeamRepository {},
}));

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CallStatus } from '../../generated/prisma/enums';
import { ApplicationRulesService } from './application-rules.service';

describe('ApplicationRulesService', () => {
  let service: ApplicationRulesService;
  let callsRepository: {
    findById: jest.Mock;
  };
  let teamRepository: {
    findPublicById: jest.Mock;
  };

  beforeEach(() => {
    callsRepository = {
      findById: jest.fn(),
    };

    teamRepository = {
      findPublicById: jest.fn(),
    };

    service = new ApplicationRulesService(
      callsRepository as never,
      teamRepository as never,
    );
  });

  it('validates all rules successfully when call and team are valid', async () => {
    const now = Date.now();
    const call = {
      id: 'call-1',
      type: 'PROGRAM_A',
      title: 'Test Call',
      status: CallStatus.OPEN,
      opensAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
      closesAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    };

    const team = {
      id: 'team-1',
      name: 'Test Team',
      leaderId: 'user-1',
      archivedAt: null,
    };

    callsRepository.findById.mockResolvedValue(call);
    teamRepository.findPublicById.mockResolvedValue(team);

    await service.validateApplicationCreationRules(
      'call-1',
      'team-1',
      'user-1',
    );

    expect(teamRepository.findPublicById).toHaveBeenCalledWith(
      'team-1',
      undefined,
    );
  });

  it('uses provided transaction client for team lookup when db is passed', async () => {
    const call = {
      id: 'call-1',
      type: 'PROGRAM_A',
      title: 'Test Call',
      status: CallStatus.OPEN,
      opensAt: null,
      closesAt: null,
    };

    const team = {
      id: 'team-1',
      name: 'Test Team',
      leaderId: 'user-1',
      archivedAt: null,
    };

    const transactionDb = {
      team: {
        findUnique: jest.fn().mockResolvedValue(team),
      },
    };

    callsRepository.findById.mockResolvedValue(call);
    teamRepository.findPublicById.mockResolvedValue(team);

    await service.validateApplicationCreationRules(
      'call-1',
      'team-1',
      'user-1',
      transactionDb as never,
    );

    expect(teamRepository.findPublicById).toHaveBeenCalledWith(
      'team-1',
      transactionDb as never,
    );
  });

  it('throws not found when call does not exist', async () => {
    callsRepository.findById.mockResolvedValue(null);

    await expect(
      service.validateApplicationCreationRules('call-404', 'team-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws conflict when call is not open', async () => {
    callsRepository.findById.mockResolvedValue({
      id: 'call-1',
      status: CallStatus.CLOSED,
      opensAt: null,
      closesAt: null,
    });

    await expect(
      service.validateApplicationCreationRules('call-1', 'team-1', 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws bad request when call has not yet opened', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    callsRepository.findById.mockResolvedValue({
      id: 'call-1',
      status: CallStatus.OPEN,
      opensAt: futureDate,
      closesAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    await expect(
      service.validateApplicationCreationRules('call-1', 'team-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws bad request when call has closed', async () => {
    const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    callsRepository.findById.mockResolvedValue({
      id: 'call-1',
      status: CallStatus.OPEN,
      opensAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      closesAt: pastDate,
    });

    await expect(
      service.validateApplicationCreationRules('call-1', 'team-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws not found when team does not exist', async () => {
    callsRepository.findById.mockResolvedValue({
      id: 'call-1',
      status: CallStatus.OPEN,
      opensAt: null,
      closesAt: null,
    });
    teamRepository.findPublicById.mockResolvedValue(null);

    await expect(
      service.validateApplicationCreationRules('call-1', 'team-404', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws conflict when team is archived', async () => {
    callsRepository.findById.mockResolvedValue({
      id: 'call-1',
      status: CallStatus.OPEN,
      opensAt: null,
      closesAt: null,
    });
    teamRepository.findPublicById.mockResolvedValue({
      id: 'team-1',
      name: 'Archived Team',
      leaderId: 'user-1',
      archivedAt: new Date('2026-04-01T00:00:00.000Z'),
    });

    await expect(
      service.validateApplicationCreationRules('call-1', 'team-1', 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws forbidden when requester is not team lead', async () => {
    callsRepository.findById.mockResolvedValue({
      id: 'call-1',
      status: CallStatus.OPEN,
      opensAt: null,
      closesAt: null,
    });
    teamRepository.findPublicById.mockResolvedValue({
      id: 'team-1',
      name: 'Test Team',
      leaderId: 'user-1',
      archivedAt: null,
    });

    await expect(
      service.validateApplicationCreationRules('call-1', 'team-1', 'user-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

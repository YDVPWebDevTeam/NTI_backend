jest.mock('../../generated/prisma/client', () => ({}), { virtual: true });
jest.mock('@prisma/client', () => ({}), { virtual: true });

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CallStatus,
  DocumentType,
  ProgramType,
  UserRole,
  UserStatus,
} from '../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { AdminCallsService } from './admin-calls.service';
import { CallsRepository } from './calls.repository';
import type { AdminCallsQueryDto } from './dto/admin-calls-query.dto';

describe('AdminCallsService', () => {
  let service: AdminCallsService;
  let callsRepository: {
    createAdminCall: jest.Mock;
    findManyForAdmin: jest.Mock;
    countForAdmin: jest.Mock;
    findAdminById: jest.Mock;
    updateAdminCall: jest.Mock;
  };

  const actorAdmin: AuthenticatedUserContext = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    organizationId: null,
  };

  const actorStudent: AuthenticatedUserContext = {
    id: 'student-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    organizationId: null,
  };

  const baseCall = {
    id: 'call-1',
    type: ProgramType.PROGRAM_A,
    title: 'Spring 2026',
    status: CallStatus.DRAFT,
    opensAt: new Date('2026-06-01T09:00:00.000Z'),
    closesAt: new Date('2026-06-30T17:00:00.000Z'),
    createdAt: new Date('2026-05-01T08:00:00.000Z'),
    updatedAt: new Date('2026-05-01T08:00:00.000Z'),
    requiredDocumentTypes: [
      {
        id: 'doc-1',
        documentType: DocumentType.CV,
        isRequired: true,
      },
    ],
    eligibilityRuleConfigs: [
      { code: 'TEAM_SIZE_MIN', threshold: '3' },
      { code: 'TRANSFERRED_SUBJECTS_MAX', threshold: '0' },
      { code: 'PROFILE_SUBJECTS_AVERAGE_MAX', threshold: '2' },
    ],
    programACategories: [],
    programAStackTags: [],
  };

  beforeEach(() => {
    callsRepository = {
      createAdminCall: jest.fn(),
      findManyForAdmin: jest.fn(),
      countForAdmin: jest.fn(),
      findAdminById: jest.fn(),
      updateAdminCall: jest.fn(),
    };

    service = new AdminCallsService(
      callsRepository as unknown as CallsRepository,
    );
  });

  it('creates draft calls for admins', async () => {
    callsRepository.createAdminCall.mockResolvedValue(baseCall);

    const result = await service.createCall(actorAdmin, {
      type: ProgramType.PROGRAM_A,
      title: '  Spring 2026  ',
      opensAt: '2026-06-01T09:00:00.000Z',
      closesAt: '2026-06-30T17:00:00.000Z',
      requiredDocumentTypes: [DocumentType.CV],
      minTeamSize: 4,
    });

    expect(callsRepository.createAdminCall).toHaveBeenCalledWith({
      type: ProgramType.PROGRAM_A,
      title: '  Spring 2026  ',
      opensAt: new Date('2026-06-01T09:00:00.000Z'),
      closesAt: new Date('2026-06-30T17:00:00.000Z'),
      requiredDocumentTypes: [DocumentType.CV],
      eligibilityRuleConfigs: [
        { code: 'TEAM_SIZE_MIN', threshold: '4' },
        { code: 'TRANSFERRED_SUBJECTS_MAX', threshold: '0' },
        { code: 'PROFILE_SUBJECTS_AVERAGE_MAX', threshold: '2' },
      ],
      categories: [],
      stackTags: [],
    });
    expect(result.status).toBe(CallStatus.DRAFT);
    expect(result.categories).toEqual([]);
    expect(result.stackTags).toEqual([]);
  });

  it('creates Program A calls with categories and stack tags', async () => {
    callsRepository.createAdminCall.mockResolvedValue({
      ...baseCall,
      programACategories: [
        {
          value: 'ai_data',
          label: 'AI & Data',
        },
      ],
      programAStackTags: [
        {
          value: 'nestjs',
          label: 'NestJS',
        },
      ],
    });

    const result = await service.createCall(actorAdmin, {
      type: ProgramType.PROGRAM_A,
      title: 'Program A Call',
      opensAt: '2026-06-01T09:00:00.000Z',
      closesAt: '2026-06-30T17:00:00.000Z',
      requiredDocumentTypes: [DocumentType.CV],
      categories: [
        {
          value: 'ai_data',
          label: 'AI & Data',
        },
      ],
      stackTags: [
        {
          value: 'nestjs',
          label: 'NestJS',
        },
      ],
    });

    expect(callsRepository.createAdminCall).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: [
          {
            value: 'ai_data',
            label: 'AI & Data',
          },
        ],
        stackTags: [
          {
            value: 'nestjs',
            label: 'NestJS',
          },
        ],
      }),
    );
    expect(result.categories).toEqual([
      {
        value: 'ai_data',
        label: 'AI & Data',
      },
    ]);
    expect(result.stackTags).toEqual([
      {
        value: 'nestjs',
        label: 'NestJS',
      },
    ]);
  });

  it('rejects duplicate Program A category values', async () => {
    await expect(
      service.createCall(actorAdmin, {
        type: ProgramType.PROGRAM_A,
        title: 'Program A Call',
        opensAt: '2026-06-01T09:00:00.000Z',
        closesAt: '2026-06-30T17:00:00.000Z',
        requiredDocumentTypes: [DocumentType.CV],
        categories: [
          {
            value: 'ai_data',
            label: 'AI & Data',
          },
          {
            value: 'ai_data',
            label: 'AI Duplicate',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(callsRepository.createAdminCall).not.toHaveBeenCalled();
  });

  it('rejects duplicate Program A stack tag values', async () => {
    await expect(
      service.createCall(actorAdmin, {
        type: ProgramType.PROGRAM_A,
        title: 'Program A Call',
        opensAt: '2026-06-01T09:00:00.000Z',
        closesAt: '2026-06-30T17:00:00.000Z',
        requiredDocumentTypes: [DocumentType.CV],
        stackTags: [
          {
            value: 'nestjs',
            label: 'NestJS',
          },
          {
            value: 'nestjs',
            label: 'NestJS Duplicate',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(callsRepository.createAdminCall).not.toHaveBeenCalled();
  });

  it('rejects non-admin call management', async () => {
    await expect(
      service.listCalls(actorStudent, {
        page: 1,
        limit: 20,
        sort: 'createdAt',
        order: 'desc',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists calls with admin filters and pagination metadata', async () => {
    const query: AdminCallsQueryDto = {
      page: 1,
      limit: 20,
      type: ProgramType.PROGRAM_A,
      status: CallStatus.DRAFT,
      sort: 'createdAt',
      order: 'desc',
    };

    callsRepository.findManyForAdmin.mockResolvedValue([baseCall]);
    callsRepository.countForAdmin.mockResolvedValue(1);

    const result = await service.listCalls(actorAdmin, query);

    expect(callsRepository.findManyForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: ProgramType.PROGRAM_A,
          status: CallStatus.DRAFT,
        },
      }),
    );
    expect(result.data[0].categories).toEqual([]);
    expect(result.data[0].stackTags).toEqual([]);
    expect(result.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      sort: 'createdAt',
      order: 'desc',
    });
  });

  it('rejects opening a PROGRAM_A call without required documents', async () => {
    callsRepository.findAdminById.mockResolvedValue({
      ...baseCall,
      requiredDocumentTypes: [],
    });

    await expect(service.openCall(actorAdmin, 'call-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(callsRepository.updateAdminCall).not.toHaveBeenCalled();
  });

  it('clears required documents and Program A options when changing a call to PROGRAM_B', async () => {
    callsRepository.findAdminById.mockResolvedValue({
      ...baseCall,
      programACategories: [
        {
          value: 'ai_data',
          label: 'AI & Data',
        },
      ],
      programAStackTags: [
        {
          value: 'nestjs',
          label: 'NestJS',
        },
      ],
    });
    callsRepository.updateAdminCall.mockResolvedValue({
      ...baseCall,
      type: ProgramType.PROGRAM_B,
      requiredDocumentTypes: [],
      eligibilityRuleConfigs: [],
      programACategories: [],
      programAStackTags: [],
    });

    const result = await service.updateCall(actorAdmin, 'call-1', {
      type: ProgramType.PROGRAM_B,
    });

    expect(callsRepository.updateAdminCall).toHaveBeenCalledWith('call-1', {
      type: ProgramType.PROGRAM_B,
      title: 'Spring 2026',
      opensAt: new Date('2026-06-01T09:00:00.000Z'),
      closesAt: new Date('2026-06-30T17:00:00.000Z'),
      requiredDocumentTypes: [],
      eligibilityRuleConfigs: [],
      categories: [],
      stackTags: [],
    });
    expect(result.type).toBe(ProgramType.PROGRAM_B);
    expect(result.categories).toEqual([]);
    expect(result.stackTags).toEqual([]);
  });

  it('returns configured Program A eligibility thresholds', async () => {
    callsRepository.findAdminById.mockResolvedValue(baseCall);

    const result = await service.getCall(actorAdmin, 'call-1');

    expect(result.minTeamSize).toBe(3);
    expect(result.maxTransferredSubjects).toBe(0);
    expect(result.maxProfileSubjectsAverage).toBe(2);
    expect(result.categories).toEqual([]);
    expect(result.stackTags).toEqual([]);
  });

  it('allows archiving only from CLOSED', async () => {
    callsRepository.findAdminById.mockResolvedValue({
      ...baseCall,
      status: CallStatus.OPEN,
    });

    await expect(
      service.archiveCall(actorAdmin, 'call-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    callsRepository.findAdminById.mockResolvedValue({
      ...baseCall,
      status: CallStatus.CLOSED,
    });
    callsRepository.updateAdminCall.mockResolvedValue({
      ...baseCall,
      status: CallStatus.ARCHIVED,
    });

    const archived = await service.archiveCall(actorAdmin, 'call-1');

    expect(callsRepository.updateAdminCall).toHaveBeenCalledWith('call-1', {
      status: CallStatus.ARCHIVED,
    });
    expect(archived.status).toBe(CallStatus.ARCHIVED);
  });
});

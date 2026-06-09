jest.mock(
  'generated/prisma/enums',
  () => ({
    ConversationChannel: { INTERNAL: 'INTERNAL', PARTICIPANTS: 'PARTICIPANTS' },
    UploadStatus: { PENDING: 'PENDING', UPLOADED: 'UPLOADED' },
    ApplicationStatus: {
      ACTIVE_PROJECT: 'ACTIVE_PROJECT',
      ARCHIVED: 'ARCHIVED',
    },
    ProgramBProjectStatus: { ACTIVE: 'ACTIVE', CLOSED: 'CLOSED' },
    ProgramType: { PROGRAM_A: 'PROGRAM_A', PROGRAM_B: 'PROGRAM_B' },
    UserRole: {
      STUDENT: 'STUDENT',
      ADMIN: 'ADMIN',
      COMPANY_OWNER: 'COMPANY_OWNER',
      COMPANY_EMPLOYEE: 'COMPANY_EMPLOYEE',
      MENTOR: 'MENTOR',
      EVALUATOR: 'EVALUATOR',
      SUPER_ADMIN: 'SUPER_ADMIN',
    },
    UserStatus: {
      PENDING: 'PENDING',
      ACTIVE: 'ACTIVE',
      SUSPENDED: 'SUSPENDED',
    },
  }),
  { virtual: true },
);

jest.mock('../files', () => ({
  FilesService: class FilesService {},
}));

jest.mock('../infrastructure/storage', () => ({
  R2StorageService: class R2StorageService {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import type { ConversationAccessService } from './conversation-access.service';
import type { ConversationsRepository } from './conversations.repository';
import type { FilesService } from '../files';
import type { R2StorageService } from '../infrastructure/storage';

function createRepositoryMock() {
  return {
    transaction: jest.fn((fn: (db: unknown) => unknown) => fn({})),
    findProgramBProjectAnchor: jest.fn().mockResolvedValue({ id: 'project-1' }),
    findApplicationAnchor: jest.fn().mockResolvedValue({ id: 'app-1' }),
    findProgramBConversationId: jest.fn().mockResolvedValue(null),
    findApplicationConversationId: jest.fn().mockResolvedValue(null),
    upsertProgramBConversation: jest.fn().mockResolvedValue({ id: 'conv-1' }),
    upsertApplicationConversation: jest
      .fn()
      .mockResolvedValue({ id: 'conv-1' }),
    findMessageContext: jest.fn(),
    createMessage: jest.fn(),
    updateMessageBody: jest.fn(),
    softDeleteMessage: jest.fn(),
    listMessages: jest.fn(),
  };
}

function createAccessServiceMock() {
  return {
    assertProgramBChannelReadable: jest.fn(),
    assertProgramBChannelWritable: jest.fn(),
    assertProgramAChannelReadable: jest.fn(),
    assertProgramAChannelWritable: jest.fn(),
  };
}

const ACTIVE_USER = {
  id: 'author-1',
  email: 'author@example.com',
  role: 'STUDENT',
  status: 'ACTIVE',
  organizationId: null,
};

function buildMessageView(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    body: 'hello team',
    editedAt: null,
    deletedAt: null,
    createdAt: new Date('2026-06-09T10:00:00.000Z'),
    conversation: { channel: 'INTERNAL' },
    authorUser: {
      id: 'author-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'author@example.com',
    },
    attachments: [],
    ...overrides,
  };
}

function buildContextView(overrides: Record<string, unknown> = {}) {
  return {
    ...buildMessageView(),
    authorUserId: 'author-1',
    conversation: {
      channel: 'INTERNAL',
      programBProjectId: 'project-1',
      applicationId: null,
    },
    ...overrides,
  };
}

describe('ConversationsService', () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let accessService: ReturnType<typeof createAccessServiceMock>;
  let filesService: { findOne: jest.Mock };
  let storageService: { createPresignedDownloadUrl: jest.Mock };
  let service: ConversationsService;

  beforeEach(() => {
    repository = createRepositoryMock();
    accessService = createAccessServiceMock();
    filesService = { findOne: jest.fn() };
    storageService = { createPresignedDownloadUrl: jest.fn() };

    service = new ConversationsService(
      repository as unknown as ConversationsRepository,
      accessService as unknown as ConversationAccessService,
      filesService as unknown as FilesService,
      storageService as unknown as R2StorageService,
    );
  });

  describe('listMessages with no conversation yet', () => {
    it('returns an empty page without creating a conversation', async () => {
      const result = await service.listProgramBMessages(
        'project-1',
        'INTERNAL' as never,
        { page: 1, limit: 20 } as never,
        ACTIVE_USER as never,
      );

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(repository.listMessages).not.toHaveBeenCalled();
    });
  });

  describe('createProgramBMessage', () => {
    it('creates a message and maps it to a DTO', async () => {
      repository.createMessage.mockResolvedValue(buildMessageView());

      const result = await service.createProgramBMessage(
        'project-1',
        'INTERNAL' as never,
        { body: 'hello team' } as never,
        ACTIVE_USER as never,
      );

      expect(accessService.assertProgramBChannelWritable).toHaveBeenCalled();
      expect(result.body).toBe('hello team');
      expect(result.isDeleted).toBe(false);
    });

    it('rejects attachments that are not owned by the author', async () => {
      filesService.findOne.mockResolvedValue({
        id: 'file-1',
        ownerId: 'someone-else',
        status: 'UPLOADED',
      });

      await expect(
        service.createProgramBMessage(
          'project-1',
          'INTERNAL' as never,
          { body: 'with file', fileIds: ['file-1'] } as never,
          ACTIVE_USER as never,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.createMessage).not.toHaveBeenCalled();
    });

    it('rejects attachments that are not fully uploaded', async () => {
      filesService.findOne.mockResolvedValue({
        id: 'file-1',
        ownerId: 'author-1',
        status: 'PENDING',
      });

      await expect(
        service.createProgramBMessage(
          'project-1',
          'INTERNAL' as never,
          { body: 'with file', fileIds: ['file-1'] } as never,
          ACTIVE_USER as never,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateMessage', () => {
    it('forbids editing a message authored by someone else', async () => {
      repository.findMessageContext.mockResolvedValue(
        buildContextView({ authorUserId: 'another-user' }),
      );

      await expect(
        service.updateMessage(
          'msg-1',
          { body: 'edited' } as never,
          ACTIVE_USER as never,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.updateMessageBody).not.toHaveBeenCalled();
    });

    it('updates own message', async () => {
      repository.findMessageContext.mockResolvedValue(buildContextView());
      repository.updateMessageBody.mockResolvedValue(
        buildMessageView({ body: 'edited', editedAt: new Date() }),
      );

      const result = await service.updateMessage(
        'msg-1',
        { body: 'edited' } as never,
        ACTIVE_USER as never,
      );

      expect(result.body).toBe('edited');
      expect(result.editedAt).not.toBeNull();
    });
  });

  describe('deleteMessage', () => {
    it('soft-deletes and renders a tombstone (blank body, no attachments)', async () => {
      repository.findMessageContext.mockResolvedValue(buildContextView());
      repository.softDeleteMessage.mockResolvedValue(
        buildMessageView({
          body: 'original secret',
          deletedAt: new Date(),
          attachments: [
            {
              id: 'att-1',
              uploadedFile: {
                id: 'file-1',
                originalName: 'secret.pdf',
                mimeType: 'application/pdf',
                size: 10,
                status: 'UPLOADED',
                key: 'k',
              },
            },
          ],
        }),
      );

      const result = await service.deleteMessage('msg-1', ACTIVE_USER as never);

      expect(result.isDeleted).toBe(true);
      expect(result.body).toBe('');
      expect(result.attachments).toEqual([]);
    });
  });
});

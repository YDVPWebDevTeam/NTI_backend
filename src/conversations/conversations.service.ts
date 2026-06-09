import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationChannel, UploadStatus } from 'generated/prisma/enums';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../common/pagination/pagination.utils';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { R2StorageService } from '../infrastructure/storage';
import { FilesService } from '../files';
import { ConversationAccessService } from './conversation-access.service';
import { ConversationAttachmentDownloadDto } from './dto/conversation-attachment-download.dto';
import {
  ConversationMessageDto,
  ConversationMessagePageDto,
} from './dto/conversation-message.dto';
import { CreateConversationMessageDto } from './dto/create-conversation-message.dto';
import { ListConversationMessagesQueryDto } from './dto/list-conversation-messages-query.dto';
import { UpdateConversationMessageDto } from './dto/update-conversation-message.dto';
import { CONVERSATIONS_MESSAGES } from './conversations.messages';
import {
  ApplicationAnchorView,
  ConversationMessageContextView,
  ConversationMessageView,
  ConversationsRepository,
  ProgramBProjectAnchorView,
} from './conversations.repository';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly repository: ConversationsRepository,
    private readonly accessService: ConversationAccessService,
    private readonly filesService: FilesService,
    private readonly storageService: R2StorageService,
  ) {}

  async listProgramBMessages(
    projectId: string,
    channel: ConversationChannel,
    query: ListConversationMessagesQueryDto,
    user: AuthenticatedUserContext,
  ): Promise<ConversationMessagePageDto> {
    const project = await this.loadProgramBAnchorOrThrow(projectId);
    this.accessService.assertProgramBChannelReadable(project, channel, user);

    const conversation = await this.repository.findProgramBConversationId(
      projectId,
      channel,
    );
    return this.listMessages(conversation?.id ?? null, query);
  }

  async createProgramBMessage(
    projectId: string,
    channel: ConversationChannel,
    dto: CreateConversationMessageDto,
    user: AuthenticatedUserContext,
  ): Promise<ConversationMessageDto> {
    const project = await this.loadProgramBAnchorOrThrow(projectId);
    this.accessService.assertProgramBChannelWritable(project, channel, user);

    const fileIds = await this.validateAttachments(dto.fileIds, user.id);

    return this.repository.transaction(async (db) => {
      const conversation = await this.repository.upsertProgramBConversation(
        projectId,
        channel,
        db,
      );
      const message = await this.repository.createMessage(
        {
          conversationId: conversation.id,
          authorUserId: user.id,
          body: dto.body,
          fileIds,
        },
        db,
      );
      return this.toMessageDto(message);
    });
  }

  async listProgramAMessages(
    applicationId: string,
    channel: ConversationChannel,
    query: ListConversationMessagesQueryDto,
    user: AuthenticatedUserContext,
  ): Promise<ConversationMessagePageDto> {
    const application = await this.loadProgramAAnchorOrThrow(applicationId);
    this.accessService.assertProgramAChannelReadable(
      application,
      channel,
      user,
    );

    const conversation = await this.repository.findApplicationConversationId(
      applicationId,
      channel,
    );
    return this.listMessages(conversation?.id ?? null, query);
  }

  async createProgramAMessage(
    applicationId: string,
    channel: ConversationChannel,
    dto: CreateConversationMessageDto,
    user: AuthenticatedUserContext,
  ): Promise<ConversationMessageDto> {
    const application = await this.loadProgramAAnchorOrThrow(applicationId);
    this.accessService.assertProgramAChannelWritable(
      application,
      channel,
      user,
    );

    const fileIds = await this.validateAttachments(dto.fileIds, user.id);

    return this.repository.transaction(async (db) => {
      const conversation = await this.repository.upsertApplicationConversation(
        applicationId,
        channel,
        db,
      );
      const message = await this.repository.createMessage(
        {
          conversationId: conversation.id,
          authorUserId: user.id,
          body: dto.body,
          fileIds,
        },
        db,
      );
      return this.toMessageDto(message);
    });
  }

  async updateMessage(
    messageId: string,
    dto: UpdateConversationMessageDto,
    user: AuthenticatedUserContext,
  ): Promise<ConversationMessageDto> {
    const message = await this.loadMessageContextOrThrow(messageId);
    await this.assertMessageChannelWritable(message, user);
    this.ensureMessageAuthor(
      message,
      user,
      CONVERSATIONS_MESSAGES.ONLY_AUTHOR_MAY_EDIT,
    );
    this.ensureMessageNotDeleted(message);

    const updated = await this.repository.updateMessageBody(
      messageId,
      dto.body,
      new Date(),
    );
    return this.toMessageDto(updated);
  }

  async deleteMessage(
    messageId: string,
    user: AuthenticatedUserContext,
  ): Promise<ConversationMessageDto> {
    const message = await this.loadMessageContextOrThrow(messageId);
    await this.assertMessageChannelWritable(message, user);
    this.ensureMessageAuthor(
      message,
      user,
      CONVERSATIONS_MESSAGES.ONLY_AUTHOR_MAY_DELETE,
    );
    this.ensureMessageNotDeleted(message);

    const deleted = await this.repository.softDeleteMessage(
      messageId,
      new Date(),
    );
    return this.toMessageDto(deleted);
  }

  async requestAttachmentDownload(
    messageId: string,
    attachmentId: string,
    user: AuthenticatedUserContext,
  ): Promise<ConversationAttachmentDownloadDto> {
    const message = await this.loadMessageContextOrThrow(messageId);
    await this.assertMessageChannelReadable(message, user);

    if (message.deletedAt !== null) {
      throw new NotFoundException(CONVERSATIONS_MESSAGES.MESSAGE_NOT_FOUND);
    }

    const attachment = message.attachments.find(
      (item) => item.id === attachmentId,
    );

    if (!attachment) {
      throw new NotFoundException(CONVERSATIONS_MESSAGES.ATTACHMENT_NOT_FOUND);
    }

    if (attachment.uploadedFile.status !== UploadStatus.UPLOADED) {
      throw new ConflictException(
        CONVERSATIONS_MESSAGES.ATTACHMENT_NOT_AVAILABLE_FOR_READING,
      );
    }

    const downloadUrl = await this.storageService.createPresignedDownloadUrl({
      key: attachment.uploadedFile.key,
      filename: attachment.uploadedFile.originalName,
      disposition: 'attachment',
    });

    return { attachmentId: attachment.id, downloadUrl };
  }

  private async listMessages(
    conversationId: string | null,
    query: ListConversationMessagesQueryDto,
  ): Promise<ConversationMessagePageDto> {
    const { page, limit, skip, take } = resolvePagination(query);

    if (conversationId === null) {
      return { data: [], meta: buildPaginationMeta(0, page, limit) };
    }

    const { data, total } = await this.repository.listMessages(
      conversationId,
      skip,
      take,
    );

    return {
      data: data.map((message) => this.toMessageDto(message)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  private async loadProgramBAnchorOrThrow(
    projectId: string,
  ): Promise<ProgramBProjectAnchorView> {
    const project = await this.repository.findProgramBProjectAnchor(projectId);
    if (!project) {
      throw new NotFoundException(CONVERSATIONS_MESSAGES.PROJECT_NOT_FOUND);
    }
    return project;
  }

  private async loadProgramAAnchorOrThrow(
    applicationId: string,
  ): Promise<ApplicationAnchorView> {
    const application =
      await this.repository.findApplicationAnchor(applicationId);
    if (!application) {
      throw new NotFoundException(CONVERSATIONS_MESSAGES.APPLICATION_NOT_FOUND);
    }
    return application;
  }

  private async loadMessageContextOrThrow(
    messageId: string,
  ): Promise<ConversationMessageContextView> {
    const message = await this.repository.findMessageContext(messageId);
    if (!message) {
      throw new NotFoundException(CONVERSATIONS_MESSAGES.MESSAGE_NOT_FOUND);
    }
    return message;
  }

  private async assertMessageChannelReadable(
    message: ConversationMessageContextView,
    user: AuthenticatedUserContext,
  ): Promise<void> {
    const { channel, programBProjectId, applicationId } = message.conversation;

    if (programBProjectId !== null) {
      const project = await this.loadProgramBAnchorOrThrow(programBProjectId);
      this.accessService.assertProgramBChannelReadable(project, channel, user);
      return;
    }

    if (applicationId !== null) {
      const application = await this.loadProgramAAnchorOrThrow(applicationId);
      this.accessService.assertProgramAChannelReadable(
        application,
        channel,
        user,
      );
      return;
    }

    throw new NotFoundException(CONVERSATIONS_MESSAGES.MESSAGE_NOT_FOUND);
  }

  private async assertMessageChannelWritable(
    message: ConversationMessageContextView,
    user: AuthenticatedUserContext,
  ): Promise<void> {
    const { channel, programBProjectId, applicationId } = message.conversation;

    if (programBProjectId !== null) {
      const project = await this.loadProgramBAnchorOrThrow(programBProjectId);
      this.accessService.assertProgramBChannelWritable(project, channel, user);
      return;
    }

    if (applicationId !== null) {
      const application = await this.loadProgramAAnchorOrThrow(applicationId);
      this.accessService.assertProgramAChannelWritable(
        application,
        channel,
        user,
      );
      return;
    }

    throw new NotFoundException(CONVERSATIONS_MESSAGES.MESSAGE_NOT_FOUND);
  }

  private ensureMessageAuthor(
    message: ConversationMessageContextView,
    user: AuthenticatedUserContext,
    forbiddenMessage: string,
  ): void {
    if (message.authorUserId !== user.id) {
      throw new ForbiddenException(forbiddenMessage);
    }
  }

  private ensureMessageNotDeleted(
    message: ConversationMessageContextView,
  ): void {
    if (message.deletedAt !== null) {
      throw new ConflictException(
        CONVERSATIONS_MESSAGES.MESSAGE_ALREADY_DELETED,
      );
    }
  }

  /**
   * Verifies every attachment file exists, is owned by the author, and is fully
   * uploaded. Returns a de-duplicated list of file ids.
   */
  private async validateAttachments(
    fileIds: string[] | undefined,
    authorId: string,
  ): Promise<string[]> {
    if (!fileIds || fileIds.length === 0) {
      return [];
    }

    const uniqueFileIds = [...new Set(fileIds)];

    if (uniqueFileIds.length > 10) {
      throw new BadRequestException(
        CONVERSATIONS_MESSAGES.TOO_MANY_ATTACHMENTS,
      );
    }

    for (const fileId of uniqueFileIds) {
      const file = await this.filesService.findOne(fileId);

      if (!file) {
        throw new BadRequestException(
          CONVERSATIONS_MESSAGES.ATTACHMENT_FILE_NOT_FOUND,
        );
      }

      if (file.ownerId !== authorId) {
        throw new BadRequestException(
          CONVERSATIONS_MESSAGES.ATTACHMENT_FILE_NOT_OWNED,
        );
      }

      if (file.status !== UploadStatus.UPLOADED) {
        throw new BadRequestException(
          CONVERSATIONS_MESSAGES.ATTACHMENT_FILE_NOT_UPLOADED,
        );
      }
    }

    return uniqueFileIds;
  }

  private toMessageDto(
    message: ConversationMessageView,
  ): ConversationMessageDto {
    const isDeleted = message.deletedAt !== null;

    return {
      id: message.id,
      channel: message.conversation.channel,
      author: message.authorUser,
      body: isDeleted ? '' : message.body,
      attachments: isDeleted
        ? []
        : message.attachments.map((attachment) => ({
            id: attachment.id,
            fileId: attachment.uploadedFile.id,
            name: attachment.uploadedFile.originalName,
            mimeType: attachment.uploadedFile.mimeType,
            size: attachment.uploadedFile.size,
            status: attachment.uploadedFile.status,
          })),
      isDeleted,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
    };
  }
}

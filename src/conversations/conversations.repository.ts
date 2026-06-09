import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ConversationChannel } from 'generated/prisma/enums';
import { PrismaDbClient, PrismaService } from '../infrastructure/database';

const userSummarySelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

const projectAnchorSelect = {
  id: true,
  status: true,
  mentorUserId: true,
  productOwnerUserId: true,
  teamId: true,
  backlogItem: {
    select: {
      organizationId: true,
    },
  },
  team: {
    select: {
      leaderId: true,
      members: {
        select: { userId: true },
      },
    },
  },
} satisfies Prisma.ProgramBProjectSelect;

const applicationAnchorSelect = {
  id: true,
  status: true,
  mentorUserId: true,
  call: {
    select: { type: true },
  },
  team: {
    select: {
      leaderId: true,
      members: {
        select: { userId: true },
      },
    },
  },
} satisfies Prisma.ApplicationSelect;

const messageSelect = {
  id: true,
  body: true,
  editedAt: true,
  deletedAt: true,
  createdAt: true,
  conversation: {
    select: { channel: true },
  },
  authorUser: {
    select: userSummarySelect,
  },
  attachments: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      uploadedFile: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
          status: true,
          key: true,
        },
      },
    },
  },
} satisfies Prisma.ConversationMessageSelect;

const messageContextSelect = {
  ...messageSelect,
  authorUserId: true,
  conversation: {
    select: {
      channel: true,
      programBProjectId: true,
      applicationId: true,
    },
  },
} satisfies Prisma.ConversationMessageSelect;

export type ProgramBProjectAnchorView = Prisma.ProgramBProjectGetPayload<{
  select: typeof projectAnchorSelect;
}>;

export type ApplicationAnchorView = Prisma.ApplicationGetPayload<{
  select: typeof applicationAnchorSelect;
}>;

export type ConversationMessageView = Prisma.ConversationMessageGetPayload<{
  select: typeof messageSelect;
}>;

export type ConversationMessageContextView =
  Prisma.ConversationMessageGetPayload<{ select: typeof messageContextSelect }>;

@Injectable()
export class ConversationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(
    fn: (client: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.client.$transaction(fn);
  }

  findProgramBProjectAnchor(
    projectId: string,
    db?: PrismaDbClient,
  ): Promise<ProgramBProjectAnchorView | null> {
    return (db ?? this.prisma.client).programBProject.findUnique({
      where: { id: projectId },
      select: projectAnchorSelect,
    });
  }

  findApplicationAnchor(
    applicationId: string,
    db?: PrismaDbClient,
  ): Promise<ApplicationAnchorView | null> {
    return (db ?? this.prisma.client).application.findUnique({
      where: { id: applicationId },
      select: applicationAnchorSelect,
    });
  }

  findProgramBConversationId(
    projectId: string,
    channel: ConversationChannel,
    db?: PrismaDbClient,
  ): Promise<{ id: string } | null> {
    return (db ?? this.prisma.client).conversation.findUnique({
      where: {
        programBProjectId_channel: { programBProjectId: projectId, channel },
      },
      select: { id: true },
    });
  }

  findApplicationConversationId(
    applicationId: string,
    channel: ConversationChannel,
    db?: PrismaDbClient,
  ): Promise<{ id: string } | null> {
    return (db ?? this.prisma.client).conversation.findUnique({
      where: { applicationId_channel: { applicationId, channel } },
      select: { id: true },
    });
  }

  upsertProgramBConversation(
    projectId: string,
    channel: ConversationChannel,
    db?: PrismaDbClient,
  ): Promise<{ id: string }> {
    return (db ?? this.prisma.client).conversation.upsert({
      where: {
        programBProjectId_channel: { programBProjectId: projectId, channel },
      },
      create: { programBProjectId: projectId, channel },
      update: {},
      select: { id: true },
    });
  }

  upsertApplicationConversation(
    applicationId: string,
    channel: ConversationChannel,
    db?: PrismaDbClient,
  ): Promise<{ id: string }> {
    return (db ?? this.prisma.client).conversation.upsert({
      where: { applicationId_channel: { applicationId, channel } },
      create: { applicationId, channel },
      update: {},
      select: { id: true },
    });
  }

  async listMessages(
    conversationId: string,
    skip: number,
    take: number,
    db?: PrismaDbClient,
  ): Promise<{ data: ConversationMessageView[]; total: number }> {
    const client = db ?? this.prisma.client;
    const [data, total] = await Promise.all([
      client.conversationMessage.findMany({
        where: { conversationId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take,
        select: messageSelect,
      }),
      client.conversationMessage.count({ where: { conversationId } }),
    ]);
    return { data, total };
  }

  createMessage(
    data: {
      conversationId: string;
      authorUserId: string;
      body: string;
      fileIds: string[];
    },
    db?: PrismaDbClient,
  ): Promise<ConversationMessageView> {
    return (db ?? this.prisma.client).conversationMessage.create({
      data: {
        conversationId: data.conversationId,
        authorUserId: data.authorUserId,
        body: data.body,
        attachments: data.fileIds.length
          ? {
              create: data.fileIds.map((uploadedFileId) => ({
                uploadedFileId,
              })),
            }
          : undefined,
      },
      select: messageSelect,
    });
  }

  findMessageContext(
    messageId: string,
    db?: PrismaDbClient,
  ): Promise<ConversationMessageContextView | null> {
    return (db ?? this.prisma.client).conversationMessage.findUnique({
      where: { id: messageId },
      select: messageContextSelect,
    });
  }

  updateMessageBody(
    messageId: string,
    body: string,
    editedAt: Date,
    db?: PrismaDbClient,
  ): Promise<ConversationMessageView> {
    return (db ?? this.prisma.client).conversationMessage.update({
      where: { id: messageId },
      data: { body, editedAt },
      select: messageSelect,
    });
  }

  softDeleteMessage(
    messageId: string,
    deletedAt: Date,
    db?: PrismaDbClient,
  ): Promise<ConversationMessageView> {
    return (db ?? this.prisma.client).conversationMessage.update({
      where: { id: messageId },
      data: { deletedAt },
      select: messageSelect,
    });
  }
}

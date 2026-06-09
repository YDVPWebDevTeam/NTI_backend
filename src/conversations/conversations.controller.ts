import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ConversationChannel, UserRole } from 'generated/prisma/enums';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ConversationsService } from './conversations.service';
import { ConversationAttachmentDownloadDto } from './dto/conversation-attachment-download.dto';
import {
  ConversationMessageDto,
  ConversationMessagePageDto,
} from './dto/conversation-message.dto';
import { CreateConversationMessageDto } from './dto/create-conversation-message.dto';
import { ListConversationMessagesQueryDto } from './dto/list-conversation-messages-query.dto';
import { UpdateConversationMessageDto } from './dto/update-conversation-message.dto';

const CONVERSATION_ROLES = [
  UserRole.STUDENT,
  UserRole.COMPANY_OWNER,
  UserRole.COMPANY_EMPLOYEE,
  UserRole.MENTOR,
  UserRole.EVALUATOR,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
] as const;

@ApiTags('Conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @ApiOkResponse({ type: ConversationMessagePageDto })
  @Get('program-b/projects/:projectId/conversations/:channel/messages')
  @Roles(...CONVERSATION_ROLES)
  listProgramBMessages(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('channel', new ParseEnumPipe(ConversationChannel))
    channel: ConversationChannel,
    @Query() query: ListConversationMessagesQueryDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.conversationsService.listProgramBMessages(
      projectId,
      channel,
      query,
      user,
    );
  }

  @ApiOkResponse({ type: ConversationMessageDto })
  @Post('program-b/projects/:projectId/conversations/:channel/messages')
  @Roles(...CONVERSATION_ROLES)
  createProgramBMessage(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('channel', new ParseEnumPipe(ConversationChannel))
    channel: ConversationChannel,
    @Body() dto: CreateConversationMessageDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.conversationsService.createProgramBMessage(
      projectId,
      channel,
      dto,
      user,
    );
  }

  @ApiOkResponse({ type: ConversationMessagePageDto })
  @Get('program-a/applications/:applicationId/conversations/:channel/messages')
  @Roles(...CONVERSATION_ROLES)
  listProgramAMessages(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('channel', new ParseEnumPipe(ConversationChannel))
    channel: ConversationChannel,
    @Query() query: ListConversationMessagesQueryDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.conversationsService.listProgramAMessages(
      applicationId,
      channel,
      query,
      user,
    );
  }

  @ApiOkResponse({ type: ConversationMessageDto })
  @Post('program-a/applications/:applicationId/conversations/:channel/messages')
  @Roles(...CONVERSATION_ROLES)
  createProgramAMessage(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('channel', new ParseEnumPipe(ConversationChannel))
    channel: ConversationChannel,
    @Body() dto: CreateConversationMessageDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.conversationsService.createProgramAMessage(
      applicationId,
      channel,
      dto,
      user,
    );
  }

  @ApiOkResponse({ type: ConversationMessageDto })
  @Patch('conversations/messages/:messageId')
  @Roles(...CONVERSATION_ROLES)
  updateMessage(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: UpdateConversationMessageDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.conversationsService.updateMessage(messageId, dto, user);
  }

  @ApiOkResponse({ type: ConversationMessageDto })
  @Delete('conversations/messages/:messageId')
  @Roles(...CONVERSATION_ROLES)
  deleteMessage(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.conversationsService.deleteMessage(messageId, user);
  }

  @ApiOkResponse({ type: ConversationAttachmentDownloadDto })
  @HttpCode(HttpStatus.OK)
  @Post('conversations/messages/:messageId/attachments/:attachmentId/download')
  @Roles(...CONVERSATION_ROLES)
  requestAttachmentDownload(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.conversationsService.requestAttachmentDownload(
      messageId,
      attachmentId,
      user,
    );
  }
}

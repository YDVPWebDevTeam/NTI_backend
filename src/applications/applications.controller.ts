import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  AttachApplicationDocumentApi,
  CreateApplicationApi,
  GetApplicationApi,
  GetApplicationDocumentCompletenessApi,
  SubmitApplicationApi,
} from './api-docs';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationDocumentDto } from './dto/application-document.dto';
import { AttachApplicationDocumentDto } from './dto/attach-application-document.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CreateNeedsInfoItemDto } from './dto/create-needs-info-item.dto';
import { CreateNeedsInfoReplyDto } from './dto/create-needs-info-reply.dto';
import { DocumentCompletenessDto } from './dto/document-completeness.dto';
import { ResubmitApplicationDto } from './dto/resubmit-application.dto';
import { ApplicationsService } from './applications.service';

@ApiTags('Applications')
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @CreateApplicationApi()
  @Post()
  createDraft(
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: CreateApplicationDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.createDraft(user, dto);
  }

  @GetApplicationApi()
  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.findById(id, user);
  }

  @AttachApplicationDocumentApi()
  @Post(':id/documents')
  attachDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: AttachApplicationDocumentDto,
  ): Promise<ApplicationDocumentDto> {
    return this.applicationsService.attachDocument(id, user, dto);
  }

  @GetApplicationDocumentCompletenessApi()
  @Get(':id/document-completeness')
  getDocumentCompleteness(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<DocumentCompletenessDto> {
    return this.applicationsService.getDocumentCompleteness(id, user);
  }

  @SubmitApplicationApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/submit')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.submit(id, user);
  }

  @Post(':id/needs-info-items')
  createNeedsInfoItem(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: CreateNeedsInfoItemDto,
  ) {
    return this.applicationsService.createNeedsInfoItem(id, user, dto);
  }

  @Post(':id/needs-info-items/:itemId/replies')
  replyToNeedsInfoItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: CreateNeedsInfoReplyDto,
  ) {
    return this.applicationsService.replyToNeedsInfoItem(id, itemId, user, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/resubmit')
  resubmit(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: ResubmitApplicationDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.resubmit(id, user, dto);
  }

  @Get(':id/needs-info-thread')
  getNeedsInfoThread(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.applicationsService.getNeedsInfoThread(id, user);
  }
}

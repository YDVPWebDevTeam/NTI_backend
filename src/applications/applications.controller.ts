import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
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
  CreateNeedsInfoItemApi,
  GetApplicationApi,
  GetApplicationDocumentCompletenessApi,
  GetNeedsInfoThreadApi,
  GetSectionHistoryApi,
  ListApplicationSectionsApi,
  ReplyToNeedsInfoItemApi,
  ResubmitApplicationApi,
  SetActiveSectionVersionApi,
  SubmitApplicationApi,
  UpsertApplicationSectionApi,
} from './api-docs';
import { ApplicationSectionDto } from './dto/application-section.dto';
import { ApplicationSectionHistoryDto } from './dto/application-section-history.dto';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationDocumentDto } from './dto/application-document.dto';
import { AttachApplicationDocumentDto } from './dto/attach-application-document.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CreateNeedsInfoItemDto } from './dto/create-needs-info-item.dto';
import { CreateNeedsInfoReplyDto } from './dto/create-needs-info-reply.dto';
import { DocumentCompletenessDto } from './dto/document-completeness.dto';
import { NeedsInfoItemDto } from './dto/needs-info-item.dto';
import { NeedsInfoReplyDto } from './dto/needs-info-reply.dto';
import { NeedsInfoThreadDto } from './dto/needs-info-thread.dto';
import { ResubmitApplicationDto } from './dto/resubmit-application.dto';
import { SetActiveSectionVersionDto } from './dto/set-active-section-version.dto';
import { UpsertApplicationSectionDto } from './dto/upsert-application-section.dto';
import { ApplicationsService } from './applications.service';
import { ApplicationSectionsService } from './application-sections.service';

@ApiTags('Applications')
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly sectionsService: ApplicationSectionsService,
  ) {}

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

  @CreateNeedsInfoItemApi()
  @Post(':id/needs-info-items')
  createNeedsInfoItem(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: CreateNeedsInfoItemDto,
  ): Promise<NeedsInfoItemDto> {
    return this.applicationsService.createNeedsInfoItem(id, user, dto);
  }

  @ReplyToNeedsInfoItemApi()
  @Post(':id/needs-info-items/:itemId/replies')
  replyToNeedsInfoItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: CreateNeedsInfoReplyDto,
  ): Promise<NeedsInfoReplyDto> {
    return this.applicationsService.replyToNeedsInfoItem(id, itemId, user, dto);
  }

  @ResubmitApplicationApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/resubmit')
  resubmit(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: ResubmitApplicationDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.resubmit(id, user, dto);
  }

  @GetNeedsInfoThreadApi()
  @Get(':id/needs-info-thread')
  getNeedsInfoThread(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<NeedsInfoThreadDto> {
    return this.applicationsService.getNeedsInfoThread(id, user);
  }

  @ListApplicationSectionsApi()
  @Get(':applicationId/sections')
  listSections(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionDto[]> {
    return this.sectionsService.listSections(applicationId, user);
  }

  @UpsertApplicationSectionApi()
  @Put(':applicationId/sections/:key')
  upsertSection(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('key') key: string,
    @Body() dto: UpsertApplicationSectionDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionDto> {
    return this.sectionsService.upsertSection(applicationId, key, dto, user);
  }

  @GetSectionHistoryApi()
  @Get(':applicationId/sections/:key/history')
  getSectionHistory(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('key') key: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionHistoryDto[]> {
    return this.sectionsService.getSectionHistory(applicationId, key, user);
  }

  @SetActiveSectionVersionApi()
  @Put(':applicationId/sections/:key/active-version')
  setActiveVersion(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('key') key: string,
    @Body() dto: SetActiveSectionVersionDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionDto> {
    return this.sectionsService.setActiveVersion(applicationId, key, dto, user);
  }
}

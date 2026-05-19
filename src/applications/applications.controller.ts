import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  AssignMentorApi,
  AttachApplicationDocumentApi,
  CreateApplicationDecisionApi,
  CreateApplicationEvaluationApi,
  CreateApplicationApi,
  CreateMentorshipNoteApi,
  CreateNeedsInfoItemApi,
  GetApplicationApi,
  GetApplicationDocumentCompletenessApi,
  GetEligibilitySignalsApi,
  GetMentorshipNotesApi,
  GetNeedsInfoThreadApi,
  GetPublicActiveCallsApi,
  GetPublicCallByIdApi,
  GetPublicCallsApi,
  GetSectionHistoryApi,
  ListApplicationEvaluationsApi,
  ListApplicationSectionsApi,
  ReplyToNeedsInfoItemApi,
  ResubmitApplicationApi,
  SetActiveSectionVersionApi,
  SubmitApplicationApi,
  UpsertApplicationSectionApi,
} from './api-docs';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationDocumentDto } from './dto/application-document.dto';
import { ApplicationEvaluationDto } from './dto/application-evaluation.dto';
import { ApplicationSectionDto } from './dto/application-section.dto';
import { ApplicationSectionHistoryDto } from './dto/application-section-history.dto';
import { AssignMentorDto } from './dto/assign-mentor.dto';
import { AttachApplicationDocumentDto } from './dto/attach-application-document.dto';
import { CreateApplicationDecisionDto } from './dto/create-application-decision.dto';
import { CreateApplicationEvaluationDto } from './dto/create-application-evaluation.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CreateMentorshipNoteDto } from './dto/create-mentorship-note.dto';
import { CreateNeedsInfoItemDto } from './dto/create-needs-info-item.dto';
import { CreateNeedsInfoReplyDto } from './dto/create-needs-info-reply.dto';
import { DocumentCompletenessDto } from './dto/document-completeness.dto';
import { EligibilitySignalsResponseDto } from './dto/eligibility-signal.dto';
import { MentorAssignmentDto } from './dto/mentor-assignment.dto';
import { NeedsInfoItemDto } from './dto/needs-info-item.dto';
import { NeedsInfoReplyDto } from './dto/needs-info-reply.dto';
import { NeedsInfoThreadDto } from './dto/needs-info-thread.dto';
import { ProgramAMentorshipNoteDto } from './dto/program-a-mentorship-note.dto';
import { PublicCallDto } from './dto/public-call.dto';
import { PublicCallsQueryDto } from './dto/public-calls-query.dto';
import { PublicCallsResponseDto } from './dto/public-calls-response.dto';
import { ResubmitApplicationDto } from './dto/resubmit-application.dto';
import { SetActiveSectionVersionDto } from './dto/set-active-section-version.dto';
import { UpsertApplicationSectionDto } from './dto/upsert-application-section.dto';
import { ApplicationSectionsService } from './application-sections.service';
import { ApplicationsService } from './applications.service';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly sectionsService: ApplicationSectionsService,
  ) {}

  @GetPublicCallsApi()
  @Get('calls')
  listPublicCalls(
    @Query() query: PublicCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    return this.applicationsService.listPublicCalls(query);
  }

  @GetPublicActiveCallsApi()
  @Get('calls/active')
  listActivePublicCalls(
    @Query() query: PublicCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    return this.applicationsService.listActivePublicCalls(query);
  }

  @GetPublicCallByIdApi()
  @Get('calls/:id')
  findPublicCallById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PublicCallDto> {
    return this.applicationsService.findPublicCallById(id);
  }

  @CreateApplicationApi()
  @Post()
  @UseGuards(JwtAuthGuard)
  createDraft(
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: CreateApplicationDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.createDraft(user, dto);
  }

  @GetApplicationApi()
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.findById(id, user);
  }

  @AttachApplicationDocumentApi()
  @Post(':id/documents')
  @UseGuards(JwtAuthGuard)
  attachDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: AttachApplicationDocumentDto,
  ): Promise<ApplicationDocumentDto> {
    return this.applicationsService.attachDocument(id, user, dto);
  }

  @GetApplicationDocumentCompletenessApi()
  @Get(':id/document-completeness')
  @UseGuards(JwtAuthGuard)
  getDocumentCompleteness(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<DocumentCompletenessDto> {
    return this.applicationsService.getDocumentCompleteness(id, user);
  }

  @GetEligibilitySignalsApi()
  @Get(':id/eligibility-signals')
  @UseGuards(JwtAuthGuard)
  getEligibilitySignals(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<EligibilitySignalsResponseDto> {
    return this.applicationsService.getEligibilitySignals(id, user);
  }

  @CreateApplicationEvaluationApi()
  @Post(':id/evaluations')
  @UseGuards(JwtAuthGuard)
  createEvaluation(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: CreateApplicationEvaluationDto,
  ): Promise<ApplicationEvaluationDto> {
    return this.applicationsService.createEvaluation(id, user, dto);
  }

  @ListApplicationEvaluationsApi()
  @Get(':id/evaluations')
  @UseGuards(JwtAuthGuard)
  listEvaluations(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationEvaluationDto[]> {
    return this.applicationsService.listEvaluations(id, user);
  }

  @CreateApplicationDecisionApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/decision')
  @UseGuards(JwtAuthGuard)
  createDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: CreateApplicationDecisionDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.createDecision(id, user, dto);
  }

  @SubmitApplicationApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.submit(id, user);
  }

  @CreateNeedsInfoItemApi()
  @Post(':id/needs-info-items')
  @UseGuards(JwtAuthGuard)
  createNeedsInfoItem(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: CreateNeedsInfoItemDto,
  ): Promise<NeedsInfoItemDto> {
    return this.applicationsService.createNeedsInfoItem(id, user, dto);
  }

  @ReplyToNeedsInfoItemApi()
  @Post(':id/needs-info-items/:itemId/replies')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  resubmit(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: ResubmitApplicationDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.resubmit(id, user, dto);
  }

  @GetNeedsInfoThreadApi()
  @Get(':id/needs-info-thread')
  @UseGuards(JwtAuthGuard)
  getNeedsInfoThread(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<NeedsInfoThreadDto> {
    return this.applicationsService.getNeedsInfoThread(id, user);
  }

  @AssignMentorApi()
  @Post(':id/assign-mentor')
  @UseGuards(JwtAuthGuard)
  assignMentor(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: AssignMentorDto,
  ): Promise<MentorAssignmentDto> {
    return this.applicationsService.assignMentor(id, user, dto);
  }

  @CreateMentorshipNoteApi()
  @Post(':id/mentorship-notes')
  @UseGuards(JwtAuthGuard)
  createMentorshipNote(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: CreateMentorshipNoteDto,
  ): Promise<ProgramAMentorshipNoteDto> {
    return this.applicationsService.createMentorshipNote(id, user, dto);
  }

  @GetMentorshipNotesApi()
  @Get(':id/mentorship-notes')
  @UseGuards(JwtAuthGuard)
  listMentorshipNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramAMentorshipNoteDto[]> {
    return this.applicationsService.listMentorshipNotes(id, user);
  }

  @ListApplicationSectionsApi()
  @Get(':applicationId/sections')
  @UseGuards(JwtAuthGuard)
  listSections(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionDto[]> {
    return this.sectionsService.listSections(applicationId, user);
  }

  @UpsertApplicationSectionApi()
  @Put(':applicationId/sections/:key')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  getSectionHistory(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('key') key: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionHistoryDto[]> {
    return this.sectionsService.getSectionHistory(applicationId, key, user);
  }

  @SetActiveSectionVersionApi()
  @Put(':applicationId/sections/:key/active-version')
  @UseGuards(JwtAuthGuard)
  setActiveVersion(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('key') key: string,
    @Body() dto: SetActiveSectionVersionDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionDto> {
    return this.sectionsService.setActiveVersion(applicationId, key, dto, user);
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma/enums';
import { GetUserContext } from '../../../auth/decorators/get-user-context.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { REVIEWER_ROLES } from '../../../common/auth/role-groups';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../../../common/types/auth-user-context.type';
import { CompleteProgramBDocumentUploadDto } from '../backlog/dto/complete-program-b-document-upload.dto';
import { ProgramBDocumentDownloadDto } from '../backlog/dto/program-b-backlog-document.dto';
import { ProgramBAssignableMentorDto } from './dto/program-b-assignable-mentor.dto';
import { AssignProgramBMentorDto } from './dto/assign-program-b-mentor.dto';
import { CreateProgramBFinalAcceptanceDto } from './dto/create-program-b-final-acceptance.dto';
import { CreateProgramBMentoringNoteDto } from './dto/create-program-b-mentoring-note.dto';
import { CreateProgramBMilestoneDto } from './dto/create-program-b-milestone.dto';
import { CreateProgramBPoReviewDto } from './dto/create-program-b-po-review.dto';
import { CreateProgramBProjectDocumentUploadDto } from './dto/create-program-b-project-document-upload.dto';
import {
  ProgramBMentoringNoteDto,
  ProgramBMilestoneDto,
  ProgramBPoReviewDto,
  ProgramBProjectDetailDto,
} from './dto/program-b-project-detail.dto';
import {
  ProgramBProjectDocumentDto,
  ProgramBProjectDocumentUploadDto,
} from './dto/program-b-project-document.dto';
import { UpdateProgramBMilestoneDto } from './dto/update-program-b-milestone.dto';
import { UpdateProgramBProjectRewardDto } from './dto/update-program-b-project-reward.dto';
import { ProgramBProjectsService } from './program-b-projects.service';

@ApiTags('Program B Projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('program-b/projects')
export class ProgramBProjectsController {
  constructor(private readonly projectsService: ProgramBProjectsService) {}

  @ApiOkResponse({ type: [ProgramBProjectDetailDto] })
  @Get('my')
  @Roles(
    UserRole.STUDENT,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_EMPLOYEE,
    UserRole.MENTOR,
    UserRole.EVALUATOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  listMy(@GetUserContext() user: AuthenticatedUserContext) {
    return this.projectsService.listMy(user);
  }

  @ApiOkResponse({ type: [ProgramBAssignableMentorDto] })
  @Get('assignable-mentors')
  @Roles(...REVIEWER_ROLES)
  listAssignableMentors(@GetUserContext() user: AuthenticatedUserContext) {
    return this.projectsService.listAssignableMentors(user);
  }

  @ApiOkResponse({ type: ProgramBProjectDetailDto })
  @Get(':id')
  @Roles(
    UserRole.STUDENT,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_EMPLOYEE,
    UserRole.MENTOR,
    UserRole.EVALUATOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  getProject(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.getProjectDetail(id, user);
  }

  @ApiOkResponse({ type: [ProgramBMilestoneDto] })
  @Get(':id/milestones')
  @Roles(
    UserRole.STUDENT,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_EMPLOYEE,
    UserRole.MENTOR,
    UserRole.EVALUATOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  listMilestones(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.listMilestones(id, user);
  }

  @Post(':id/milestones')
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  createMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramBMilestoneDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.createMilestone(id, dto, user);
  }

  @Patch(':id/milestones/:milestoneId')
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  updateMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() dto: UpdateProgramBMilestoneDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.updateMilestone(id, milestoneId, dto, user);
  }

  @ApiOkResponse({ type: [ProgramBMentoringNoteDto] })
  @Get(':id/mentoring-notes')
  @Roles(
    UserRole.STUDENT,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_EMPLOYEE,
    UserRole.MENTOR,
    UserRole.EVALUATOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  listMentoringNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.listMentoringNotes(id, user);
  }

  @Post(':id/mentoring-notes')
  @Roles(
    UserRole.MENTOR,
    UserRole.EVALUATOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  createMentoringNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramBMentoringNoteDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.createMentoringNote(id, dto, user);
  }

  @ApiOkResponse({ type: [ProgramBPoReviewDto] })
  @Get(':id/po-reviews')
  @Roles(
    UserRole.STUDENT,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_EMPLOYEE,
    UserRole.MENTOR,
    UserRole.EVALUATOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  listPoReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.listPoReviews(id, user);
  }

  @Post(':id/po-reviews')
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  createPoReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramBPoReviewDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.createPoReview(id, dto, user);
  }

  @ApiOkResponse({ type: [ProgramBProjectDocumentDto] })
  @Get(':id/documents')
  @Roles(
    UserRole.STUDENT,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_EMPLOYEE,
    UserRole.MENTOR,
    UserRole.EVALUATOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  listDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.listDocuments(id, user);
  }

  @ApiOkResponse({ type: ProgramBProjectDocumentUploadDto })
  @Post(':id/documents/upload')
  @Roles(UserRole.STUDENT, UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  createDocumentUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramBProjectDocumentUploadDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.createDocumentUpload(id, dto, user);
  }

  @ApiOkResponse({ type: ProgramBProjectDocumentDto })
  @Post(':id/documents/:documentId/complete')
  @Roles(UserRole.STUDENT, UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  completeDocumentUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: CompleteProgramBDocumentUploadDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.completeDocumentUpload(
      id,
      documentId,
      dto,
      user,
    );
  }

  @ApiOkResponse({ type: ProgramBDocumentDownloadDto })
  @Post(':id/documents/:documentId/download')
  @Roles(
    UserRole.STUDENT,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_EMPLOYEE,
    UserRole.MENTOR,
    UserRole.EVALUATOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  requestDocumentDownload(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.requestDocumentDownload(id, documentId, user);
  }

  @ApiOkResponse({ type: ProgramBProjectDetailDto })
  @HttpCode(HttpStatus.OK)
  @Patch(':id/reward')
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_EMPLOYEE,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  updateReward(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgramBProjectRewardDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.updateReward(id, dto, user);
  }

  @ApiOkResponse({ type: ProgramBProjectDetailDto })
  @Post(':id/assign-mentor')
  @HttpCode(HttpStatus.OK)
  @Roles(...REVIEWER_ROLES)
  assignMentor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignProgramBMentorDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.assignMentor(id, dto, user);
  }

  @Post(':id/final-acceptance')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_EMPLOYEE,
    UserRole.EVALUATOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  recordFinalAcceptance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramBFinalAcceptanceDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.recordFinalAcceptance(id, dto, user);
  }
}

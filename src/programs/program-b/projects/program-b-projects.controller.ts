import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserContext } from '../../../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUserContext } from '../../../common/types/auth-user-context.type';
import { CreateProgramBFinalAcceptanceDto } from './dto/create-program-b-final-acceptance.dto';
import { CreateProgramBMentoringNoteDto } from './dto/create-program-b-mentoring-note.dto';
import { CreateProgramBMilestoneDto } from './dto/create-program-b-milestone.dto';
import { CreateProgramBPoReviewDto } from './dto/create-program-b-po-review.dto';
import { UpdateProgramBMilestoneDto } from './dto/update-program-b-milestone.dto';
import { ProgramBProjectsService } from './program-b-projects.service';

@ApiTags('Program B Projects')
@UseGuards(JwtAuthGuard)
@Controller('program-b/projects')
export class ProgramBProjectsController {
  constructor(private readonly projectsService: ProgramBProjectsService) {}

  @Post(':id/milestones')
  createMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramBMilestoneDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.createMilestone(id, dto, user);
  }

  @Patch(':id/milestones/:milestoneId')
  updateMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() dto: UpdateProgramBMilestoneDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.updateMilestone(id, milestoneId, dto, user);
  }

  @Post(':id/mentoring-notes')
  createMentoringNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramBMentoringNoteDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.createMentoringNote(id, dto, user);
  }

  @Post(':id/po-reviews')
  createPoReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramBPoReviewDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.createPoReview(id, dto, user);
  }

  @Post(':id/final-acceptance')
  @HttpCode(HttpStatus.OK)
  recordFinalAcceptance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramBFinalAcceptanceDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ) {
    return this.projectsService.recordFinalAcceptance(id, dto, user);
  }
}

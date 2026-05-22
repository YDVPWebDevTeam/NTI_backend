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
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  ApproveApplicationApi,
  ArchiveApplicationApi,
  ActivateApplicationApi,
  CompleteApplicationApi,
  FormalVerifyApplicationApi,
  PauseApplicationApi,
  RejectApplicationApi,
  StartEvaluationApplicationApi,
  StartApplicationOnboardingApi,
} from './api-docs';
import { ApplicationsService } from './applications.service';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationLifecycleTransitionDto } from './dto/application-lifecycle-transition.dto';
import { CreateProgramAMilestoneDto } from './dto/create-program-a-milestone.dto';
import { OptionalApplicationTransitionNoteDto } from './dto/optional-application-transition-note.dto';
import { ProgramAMilestoneDto } from './dto/program-a-milestone.dto';
import { UpdateProgramAMilestoneDto } from './dto/update-program-a-milestone.dto';
import { InternalProgramAApplicationDto } from './dto/internal-program-a-application.dto';

@ApiTags('Admin')
@Controller('admin/applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.EVALUATOR,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.MENTOR,
)
export class AdminApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}
  @Get('program-a')
  listProgramAApplications(
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<InternalProgramAApplicationDto[]> {
    return this.applicationsService.listInternalProgramAApplications(user);
  }

  @Get(':id/program-a-milestones')
  listProgramAMilestones(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramAMilestoneDto[]> {
    return this.applicationsService.listProgramAMilestones(id, user);
  }

  @Post(':id/program-a-milestones')
  createProgramAMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: CreateProgramAMilestoneDto,
  ): Promise<ProgramAMilestoneDto> {
    return this.applicationsService.createProgramAMilestone(id, user, dto);
  }

  @Patch(':id/program-a-milestones/:milestoneId')
  updateProgramAMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: UpdateProgramAMilestoneDto,
  ): Promise<ProgramAMilestoneDto> {
    return this.applicationsService.updateProgramAMilestone(
      id,
      milestoneId,
      user,
      dto,
    );
  }

  @FormalVerifyApplicationApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/formal-verify')
  formalVerify(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: OptionalApplicationTransitionNoteDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.formalVerify(id, user, dto?.reason);
  }

  @StartEvaluationApplicationApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/start-evaluation')
  startEvaluation(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: OptionalApplicationTransitionNoteDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.startEvaluation(id, user, dto?.reason);
  }

  @ApproveApplicationApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: OptionalApplicationTransitionNoteDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.approve(id, user, dto?.reason);
  }

  @RejectApplicationApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: ApplicationLifecycleTransitionDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.reject(id, user, dto.reason);
  }

  @StartApplicationOnboardingApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/start-onboarding')
  startOnboarding(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.startOnboarding(id, user);
  }

  @ActivateApplicationApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/activate')
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.activate(id, user);
  }

  @PauseApplicationApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/pause')
  pause(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: ApplicationLifecycleTransitionDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.pause(id, user, dto.reason);
  }

  @CompleteApplicationApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/complete')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.complete(id, user);
  }

  @ArchiveApplicationApi()
  @HttpCode(HttpStatus.OK)
  @Post(':id/archive')
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: ApplicationLifecycleTransitionDto,
  ): Promise<ApplicationDetailDto> {
    return this.applicationsService.archive(id, user, dto.reason);
  }
}

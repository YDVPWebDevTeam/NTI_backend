import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  ActivateApplicationApi,
  ArchiveApplicationApi,
  CompleteApplicationApi,
  PauseApplicationApi,
  StartApplicationOnboardingApi,
} from './api-docs';
import { ApplicationsService } from './applications.service';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationLifecycleTransitionDto } from './dto/application-lifecycle-transition.dto';

@ApiTags('Admin')
@Controller('admin/applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EVALUATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

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

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  CreateApplicationApi,
  GetApplicationApi,
  GetSectionHistoryApi,
  ListApplicationSectionsApi,
  SetActiveSectionVersionApi,
  UpsertApplicationSectionApi,
} from './api-docs';
import { ApplicationSectionDto } from './dto/application-section.dto';
import { ApplicationSectionHistoryDto } from './dto/application-section-history.dto';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
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
    if (dto.key !== key) {
      throw new BadRequestException('Section key mismatch');
    }

    return this.sectionsService.upsertSection(applicationId, dto, user);
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

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  CreateApplicationApi,
  GetApplicationApi,
  GetPublicActiveCallsApi,
  GetPublicCallByIdApi,
  GetPublicCallsApi,
} from './api-docs';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { PublicCallDto } from './dto/public-call.dto';
import { PublicCallsQueryDto } from './dto/public-calls-query.dto';
import { PublicCallsResponseDto } from './dto/public-calls-response.dto';
import { ApplicationsService } from './applications.service';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

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
}

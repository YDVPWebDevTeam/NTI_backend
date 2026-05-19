import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma/enums';
import { GetUserContext } from '../../../auth/decorators/get-user-context.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../../../common/types/auth-user-context.type';
import {
  AcceptProgramBBacklogCandidateApi,
  ArchiveProgramBBacklogItemApi,
  AssignProductOwnerApi,
  CreateProgramBProjectFromCandidateApi,
  CreateProgramBBacklogItemApi,
  DeleteProgramBBacklogItemApi,
  ListMyProgramBBacklogItemsApi,
  ListProgramBBacklogCandidatesApi,
  PublishProgramBBacklogItemApi,
  RejectProgramBBacklogCandidateApi,
  ShortlistProgramBBacklogCandidateApi,
  UpdateProgramBBacklogItemApi,
} from './api-docs';
import {
  ProgramBProjectDto,
  toProgramBProjectDto,
} from '../projects/dto/program-b-project.dto';
import { AssignProductOwnerDto } from './dto/assign-product-owner.dto';
import { CompleteProgramBDocumentUploadDto } from './dto/complete-program-b-document-upload.dto';
import { CreateProgramBBacklogDocumentUploadDto } from './dto/create-program-b-backlog-document-upload.dto';
import { CreateProgramBBacklogItemDto } from './dto/create-program-b-backlog-item.dto';
import { GetProgramBBacklogQueryDto } from './dto/get-program-b-backlog-query.dto';
import { GetProgramBBacklogResponseDto } from './dto/get-program-b-backlog-response.dto';
import {
  ProgramBBacklogDocumentDto,
  ProgramBBacklogDocumentUploadDto,
  ProgramBDocumentDownloadDto,
} from './dto/program-b-backlog-document.dto';
import { ProgramBBacklogCandidatesResponseDto } from './dto/program-b-backlog-candidates-response.dto';
import { ProgramBCandidateDecisionDto } from './dto/program-b-candidate-decision.dto';
import { ProgramBBacklogItemDto } from './dto/program-b-backlog-item.dto';
import { UpdateProgramBBacklogItemDto } from './dto/update-program-b-backlog-item.dto';
import { ProgramBBacklogService } from './program-b-backlog.service';
import {
  ProgramBTeamApplicationResponseDto,
  toProgramBTeamApplicationResponseDto,
} from '../team-application/dto/team-application-response.dto';

@ApiTags('Program B Backlog')
@Controller('program-b/backlog')
export class ProgramBBacklogController {
  constructor(private readonly backlogService: ProgramBBacklogService) {}

  @CreateProgramBBacklogItemApi()
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  create(
    @Body() dto: CreateProgramBBacklogItemDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.create(dto, user);
  }

  @ListMyProgramBBacklogItemsApi()
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  listPublished(
    @Query() query: GetProgramBBacklogQueryDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<GetProgramBBacklogResponseDto> {
    return this.backlogService.listPublished(query, user);
  }

  @ListMyProgramBBacklogItemsApi()
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  listMy(
    @Query() query: GetProgramBBacklogQueryDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<GetProgramBBacklogResponseDto> {
    return this.backlogService.listMy(query, user);
  }

  @ApiOkResponse({ type: ProgramBBacklogItemDto })
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findPublishedById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.findPublishedById(id, user);
  }

  @UpdateProgramBBacklogItemApi()
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgramBBacklogItemDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.update(id, dto, user);
  }

  @AssignProductOwnerApi()
  @Patch(':id/product-owner')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  assignProductOwner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignProductOwnerDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.assignProductOwner(id, dto, user);
  }

  @DeleteProgramBBacklogItemApi()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.remove(id, user);
  }

  @PublishProgramBBacklogItemApi()
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.publish(id, user);
  }

  @ArchiveProgramBBacklogItemApi()
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogItemDto> {
    return this.backlogService.archive(id, user);
  }

  @ApiOkResponse({ type: ProgramBBacklogDocumentUploadDto })
  @Post(':id/documents/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  createDocumentUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramBBacklogDocumentUploadDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogDocumentUploadDto> {
    return this.backlogService.createBacklogDocumentUpload(id, dto, user);
  }

  @ApiOkResponse({ type: ProgramBBacklogDocumentDto })
  @Post(':id/documents/:documentId/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  completeDocumentUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: CompleteProgramBDocumentUploadDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogDocumentDto> {
    return this.backlogService.completeBacklogDocumentUpload(
      id,
      documentId,
      dto,
      user,
    );
  }

  @ApiOkResponse({ type: [ProgramBBacklogDocumentDto] })
  @Get(':id/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.STUDENT,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_EMPLOYEE,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.EVALUATOR,
  )
  listDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogDocumentDto[]> {
    return this.backlogService.listBacklogDocuments(id, user);
  }

  @ApiOkResponse({ type: ProgramBDocumentDownloadDto })
  @Post(':id/documents/:documentId/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.STUDENT,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_EMPLOYEE,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.EVALUATOR,
  )
  requestDocumentDownload(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBDocumentDownloadDto> {
    return this.backlogService.requestBacklogDocumentDownload(
      id,
      documentId,
      user,
    );
  }

  @ListProgramBBacklogCandidatesApi()
  @Get(':id/candidates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  async listCandidates(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBBacklogCandidatesResponseDto> {
    const applications = await this.backlogService.listCandidates(id, user);

    return {
      data: applications.map(toProgramBTeamApplicationResponseDto),
    };
  }

  @Post(':id/candidates/:applicationId/shortlist')
  @ShortlistProgramBBacklogCandidateApi()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  async shortlistCandidate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: ProgramBCandidateDecisionDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBTeamApplicationResponseDto> {
    const application = await this.backlogService.shortlistCandidate(
      id,
      applicationId,
      dto,
      user,
    );

    return toProgramBTeamApplicationResponseDto(application as never);
  }

  @Post(':id/candidates/:applicationId/accept')
  @AcceptProgramBBacklogCandidateApi()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  async acceptCandidate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: ProgramBCandidateDecisionDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBTeamApplicationResponseDto> {
    const application = await this.backlogService.acceptCandidate(
      id,
      applicationId,
      dto,
      user,
    );

    return toProgramBTeamApplicationResponseDto(application as never);
  }

  @Post(':id/candidates/:applicationId/reject')
  @RejectProgramBBacklogCandidateApi()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  async rejectCandidate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: ProgramBCandidateDecisionDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBTeamApplicationResponseDto> {
    const application = await this.backlogService.rejectCandidate(
      id,
      applicationId,
      dto,
      user,
    );

    return toProgramBTeamApplicationResponseDto(application as never);
  }

  @Post(':id/candidates/:applicationId/create-project')
  @CreateProgramBProjectFromCandidateApi()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
  async createProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBProjectDto> {
    const project = await this.backlogService.createProjectFromCandidate(
      id,
      applicationId,
      user,
    );

    return toProgramBProjectDto(project);
  }
}

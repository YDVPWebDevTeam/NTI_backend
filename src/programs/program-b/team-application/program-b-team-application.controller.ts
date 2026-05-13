import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ProgramBTeamApplication,
  ProgramBTeamApplicationCv,
  UploadedFile,
} from 'generated/prisma/client';
import { ProgramBTeamApplicationService } from './program-b-team-application.service';
import { CreateTeamApplicationDto } from './dto/create-team-application.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ProgramBTeamApplicationResponseDto } from './dto/team-application-response.dto';
import {
  SubmitTeamApplicationApi,
  GetMyTeamApplicationApi,
} from './api-docs/program-b-team-application-api-docs.decorators';

type ApplicationWithCv = ProgramBTeamApplication & {
  cvAttachments: Array<
    ProgramBTeamApplicationCv & { uploadedFile: UploadedFile }
  >;
};

@ApiTags('Program B - Team Applications')
@Controller('program-b/backlog/:backlogItemId/team-applications')
@UseGuards(JwtAuthGuard)
export class ProgramBTeamApplicationController {
  constructor(private applicationService: ProgramBTeamApplicationService) {}

  @Post()
  @SubmitTeamApplicationApi()
  async submit(
    @Param('backlogItemId', ParseUUIDPipe) backlogItemId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTeamApplicationDto,
  ): Promise<ProgramBTeamApplicationResponseDto> {
    const application = await this.applicationService.submitApplication(
      user.id,
      backlogItemId,
      dto,
    );
    return this.mapToResponseDto(application as ApplicationWithCv);
  }

  @Get('me')
  @GetMyTeamApplicationApi()
  async getMy(
    @Param('backlogItemId', ParseUUIDPipe) backlogItemId: string,
    @Query('teamId', ParseUUIDPipe) teamId: string,
    @CurrentUser() user: { id: string },
  ): Promise<ProgramBTeamApplicationResponseDto> {
    const application = await this.applicationService.getMyApplication(
      user.id,
      backlogItemId,
      teamId,
    );
    return this.mapToResponseDto(application as ApplicationWithCv);
  }

  private mapToResponseDto(
    application: ApplicationWithCv,
  ): ProgramBTeamApplicationResponseDto {
    return {
      id: application.id,
      backlogItemId: application.backlogItemId,
      teamId: application.teamId,
      createdById: application.createdById,
      motivation: application.motivation,
      proposalText: application.proposalText ?? undefined,
      proposalFileId: application.proposalFileId ?? undefined,
      status: application.status,
      submittedAt: application.submittedAt,
      withdrawnAt: application.withdrawnAt ?? undefined,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      cvAttachments: application.cvAttachments.map((cv) => ({
        id: cv.id,
        teamMemberUserId: cv.teamMemberUserId,
        uploadedFileId: cv.uploadedFileId,
        file: {
          id: cv.uploadedFile.id,
          originalName: cv.uploadedFile.originalName,
          mimeType: cv.uploadedFile.mimeType,
          size: cv.uploadedFile.size,
        },
      })),
    };
  }
}

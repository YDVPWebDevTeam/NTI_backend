import {
  Controller,
  Delete,
  Param,
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
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ProgramBTeamApplicationResponseDto } from './dto/team-application-response.dto';
import { WithdrawTeamApplicationApi } from './api-docs/program-b-team-application-api-docs.decorators';

type ApplicationWithCv = ProgramBTeamApplication & {
  cvAttachments: Array<
    ProgramBTeamApplicationCv & { uploadedFile: UploadedFile }
  >;
};

@ApiTags('Program B - Team Applications')
@Controller('program-b/team-applications')
@UseGuards(JwtAuthGuard)
export class ProgramBTeamApplicationWithdrawalController {
  constructor(private applicationService: ProgramBTeamApplicationService) {}

  @Delete(':applicationId')
  @WithdrawTeamApplicationApi()
  async withdraw(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser() user: { id: string },
  ): Promise<ProgramBTeamApplicationResponseDto> {
    const application = await this.applicationService.withdrawApplication(
      user.id,
      applicationId,
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

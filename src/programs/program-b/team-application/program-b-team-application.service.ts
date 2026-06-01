import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CallsRepository } from '../../../applications/calls/calls.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateTeamApplicationDto } from './dto/create-team-application.dto';
import {
  ProgramBTeamApplication,
  ProgramBTeamApplicationCv,
  ProgramBTeamApplicationStatus,
  BacklogItemStatus,
  UploadStatus,
  UploadedFile,
} from 'generated/prisma/client';
import { FilesService } from '../../../files/files.service';
import { TeamService } from '../../../team/team.service';
import { ProgramBBacklogService } from '../backlog/program-b-backlog.service';
import { PROGRAM_B_TEAM_APPLICATION_MESSAGES } from './program-b-team-application.messages';

type ApplicationWithCv = ProgramBTeamApplication & {
  cvAttachments: Array<
    ProgramBTeamApplicationCv & { uploadedFile: UploadedFile }
  >;
};

@Injectable()
export class ProgramBTeamApplicationService {
  constructor(
    private prisma: PrismaService,
    private uploadedFileService: FilesService,
    private teamService: TeamService,
    private backlogItemService: ProgramBBacklogService,
    private callsRepository: CallsRepository,
  ) {}

  async submitApplication(
    userId: string,
    backlogItemId: string,
    dto: CreateTeamApplicationDto,
  ): Promise<ApplicationWithCv> {
    const [backlogItem, hasActiveCall] = await Promise.all([
      this.backlogItemService.findOne(backlogItemId),
      this.callsRepository.hasActiveProgramBCall(new Date()),
    ]);

    if (!backlogItem) {
      throw new NotFoundException(
        PROGRAM_B_TEAM_APPLICATION_MESSAGES.BACKLOG_ITEM_NOT_FOUND,
      );
    }
    if (!hasActiveCall) {
      throw new ConflictException(
        PROGRAM_B_TEAM_APPLICATION_MESSAGES.NO_ACTIVE_PROGRAM_B_CALL,
      );
    }
    if (backlogItem.status !== BacklogItemStatus.PUBLISHED) {
      throw new ConflictException(
        PROGRAM_B_TEAM_APPLICATION_MESSAGES.BACKLOG_ITEM_MUST_BE_PUBLISHED,
      );
    }

    await this.teamService.ensureLeaderOwnedUnarchivedTeam(dto.teamId, userId);

    if (!dto.proposalText && !dto.proposalFileId) {
      throw new BadRequestException(
        PROGRAM_B_TEAM_APPLICATION_MESSAGES.PROPOSAL_TEXT_OR_FILE_REQUIRED,
      );
    }
    if (dto.proposalFileId) {
      const proposalFile = await this.uploadedFileService.findOne(
        dto.proposalFileId,
      );
      if (!proposalFile) {
        throw new NotFoundException(
          PROGRAM_B_TEAM_APPLICATION_MESSAGES.PROPOSAL_FILE_NOT_FOUND,
        );
      }
      if (proposalFile.status !== UploadStatus.UPLOADED) {
        throw new BadRequestException(
          PROGRAM_B_TEAM_APPLICATION_MESSAGES.PROPOSAL_FILE_NOT_IN_UPLOADED_STATE,
        );
      }
      const isMember = await this.teamService.isTeamMember(
        dto.teamId,
        proposalFile.ownerId,
      );
      if (!isMember) {
        throw new BadRequestException(
          PROGRAM_B_TEAM_APPLICATION_MESSAGES.PROPOSAL_FILE_NOT_TEAM_MEMBER,
        );
      }
    }

    const uploadedFiles = await Promise.all(
      dto.cvFileIds.map(async (fileId) => {
        const uploadedFile = await this.uploadedFileService.findOne(fileId);
        if (!uploadedFile) {
          throw new NotFoundException(`CV file ${fileId} not found`);
        }
        if (uploadedFile.status !== UploadStatus.UPLOADED) {
          throw new BadRequestException(
            `CV file ${fileId} is not in uploaded state`,
          );
        }
        const isMember = await this.teamService.isTeamMember(
          dto.teamId,
          uploadedFile.ownerId,
        );
        if (!isMember) {
          throw new BadRequestException(
            `CV file ${fileId} does not belong to a team member`,
          );
        }
        return uploadedFile;
      }),
    );

    const ownerIds = uploadedFiles.map((file) => file.ownerId);
    const uniqueOwnerIds = new Set(ownerIds);
    if (uniqueOwnerIds.size !== ownerIds.length) {
      throw new BadRequestException(
        'Only one CV file may be provided per team member',
      );
    }

    const existingActive =
      await this.prisma.client.programBTeamApplication.findFirst({
        where: {
          backlogItemId,
          teamId: dto.teamId,
          status: {
            in: [
              ProgramBTeamApplicationStatus.SUBMITTED,
              ProgramBTeamApplicationStatus.SHORTLISTED,
              ProgramBTeamApplicationStatus.ACCEPTED,
              ProgramBTeamApplicationStatus.PROJECT_CREATED,
            ],
          },
        },
      });
    if (existingActive) {
      throw new ConflictException(
        'Active application already exists for this team and backlog item',
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      const callStillActive = await this.callsRepository.hasActiveProgramBCall(
        new Date(),
        tx,
      );
      if (!callStillActive) {
        throw new ConflictException(
          PROGRAM_B_TEAM_APPLICATION_MESSAGES.NO_ACTIVE_PROGRAM_B_CALL,
        );
      }

      const application = await tx.programBTeamApplication.create({
        data: {
          backlogItemId,
          teamId: dto.teamId,
          createdById: userId,
          motivation: dto.motivation,
          proposalText: dto.proposalText,
          proposalFileId: dto.proposalFileId,
          status: ProgramBTeamApplicationStatus.SUBMITTED,
        },
      });

      const cvRecords = await Promise.all(
        uploadedFiles.map(async (uploadedFile) => {
          return tx.programBTeamApplicationCv.create({
            data: {
              applicationId: application.id,
              teamMemberUserId: uploadedFile.ownerId,
              uploadedFileId: uploadedFile.id,
            },
            include: {
              uploadedFile: true,
            },
          });
        }),
      );

      return { ...application, cvAttachments: cvRecords };
    });
  }

  async getMyApplication(
    userId: string,
    backlogItemId: string,
    teamId: string,
  ): Promise<ApplicationWithCv> {
    await this.teamService.ensureLeaderOwnedUnarchivedTeam(teamId, userId);

    const application =
      await this.prisma.client.programBTeamApplication.findFirst({
        where: {
          backlogItemId,
          teamId,
          status: {
            in: [
              ProgramBTeamApplicationStatus.SUBMITTED,
              ProgramBTeamApplicationStatus.SHORTLISTED,
              ProgramBTeamApplicationStatus.ACCEPTED,
              ProgramBTeamApplicationStatus.PROJECT_CREATED,
            ],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          cvAttachments: {
            include: {
              uploadedFile: true,
            },
          },
        },
      });

    if (!application) {
      throw new NotFoundException(
        PROGRAM_B_TEAM_APPLICATION_MESSAGES.APPLICATION_NOT_FOUND,
      );
    }
    return application;
  }

  async withdrawApplication(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationWithCv> {
    const application =
      await this.prisma.client.programBTeamApplication.findUnique({
        where: { id: applicationId },
        include: { team: true },
      });

    if (!application) {
      throw new NotFoundException(
        PROGRAM_B_TEAM_APPLICATION_MESSAGES.APPLICATION_NOT_FOUND,
      );
    }

    if (application.team.leaderId !== userId) {
      throw new ForbiddenException(
        PROGRAM_B_TEAM_APPLICATION_MESSAGES.ONLY_TEAM_LEADER_CAN_WITHDRAW,
      );
    }

    if (application.status !== ProgramBTeamApplicationStatus.SUBMITTED) {
      throw new ConflictException(
        PROGRAM_B_TEAM_APPLICATION_MESSAGES.WITHDRAWAL_ONLY_FROM_SUBMITTED,
      );
    }

    return this.prisma.client.programBTeamApplication.update({
      where: { id: applicationId },
      data: {
        status: ProgramBTeamApplicationStatus.WITHDRAWN,
        withdrawnAt: new Date(),
      },
      include: { cvAttachments: { include: { uploadedFile: true } } },
    });
  }
}

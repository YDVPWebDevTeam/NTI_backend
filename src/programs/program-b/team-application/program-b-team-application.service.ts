import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
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
  ) {}

  async submitApplication(
    userId: string,
    backlogItemId: string,
    dto: CreateTeamApplicationDto,
  ): Promise<ApplicationWithCv> {
    const backlogItem = await this.backlogItemService.findOne(backlogItemId);
    if (!backlogItem) {
      throw new NotFoundException('Backlog item not found');
    }
    if (backlogItem.status !== BacklogItemStatus.PUBLISHED) {
      throw new ConflictException('Backlog item must be published');
    }

    await this.teamService.ensureLeaderOwnedUnarchivedTeam(dto.teamId, userId);

    if (!dto.proposalText && !dto.proposalFileId) {
      throw new BadRequestException(
        'Either proposalText or proposalFileId must be provided',
      );
    }
    if (dto.proposalFileId) {
      const proposalFile = await this.uploadedFileService.findOne(
        dto.proposalFileId,
      );
      if (!proposalFile) {
        throw new NotFoundException('Proposal file not found');
      }
      if (proposalFile.status !== UploadStatus.UPLOADED) {
        throw new BadRequestException('Proposal file is not in uploaded state');
      }
      const isMember = await this.teamService.isTeamMember(
        dto.teamId,
        proposalFile.ownerId,
      );
      if (!isMember) {
        throw new BadRequestException(
          'Proposal file does not belong to a team member',
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
      throw new NotFoundException('Application not found');
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
      throw new NotFoundException('Application not found');
    }

    if (application.team.leaderId !== userId) {
      throw new ForbiddenException('Only team leader can withdraw application');
    }

    if (application.status !== ProgramBTeamApplicationStatus.SUBMITTED) {
      throw new ConflictException(
        'Withdrawal allowed only from SUBMITTED status',
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

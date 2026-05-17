import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramBTeamApplicationStatus } from '../../../../../generated/prisma/enums';

class CvAttachmentFileDto {
  @ApiProperty({ description: 'File identifier.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Original file name.', example: 'cv.pdf' })
  originalName!: string;

  @ApiProperty({ description: 'MIME type.', example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes.', example: 102400 })
  size!: number;
}

class CvAttachmentDto {
  @ApiProperty({ description: 'CV attachment identifier.', format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: 'Team member user identifier.',
    format: 'uuid',
  })
  teamMemberUserId!: string;

  @ApiProperty({ description: 'Uploaded file identifier.', format: 'uuid' })
  uploadedFileId!: string;

  @ApiProperty({ type: CvAttachmentFileDto })
  file!: CvAttachmentFileDto;
}

export class ProgramBTeamApplicationResponseDto {
  @ApiProperty({ description: 'Application identifier.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Backlog item identifier.', format: 'uuid' })
  backlogItemId!: string;

  @ApiProperty({ description: 'Team identifier.', format: 'uuid' })
  teamId!: string;

  @ApiProperty({
    description: 'User who created the application.',
    format: 'uuid',
  })
  createdById!: string;

  @ApiProperty({
    description: 'Motivation statement.',
    example: 'Our team is excited to work on this project because...',
  })
  motivation!: string;

  @ApiPropertyOptional({
    description: 'Proposal text.',
    example: 'We propose to implement the solution using...',
  })
  proposalText?: string;

  @ApiPropertyOptional({
    description: 'Uploaded proposal file identifier.',
    format: 'uuid',
  })
  proposalFileId?: string;

  @ApiProperty({
    description: 'Application status.',
    enum: ProgramBTeamApplicationStatus,
    example: ProgramBTeamApplicationStatus.SUBMITTED,
  })
  status!: ProgramBTeamApplicationStatus;

  @ApiProperty({ description: 'Submission timestamp.' })
  submittedAt!: Date;

  @ApiPropertyOptional({ description: 'Withdrawal timestamp.' })
  withdrawnAt?: Date;

  @ApiProperty({ description: 'Creation timestamp.' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp.' })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Attached CV files.',
    type: [CvAttachmentDto],
  })
  cvAttachments!: CvAttachmentDto[];
}

type ApplicationRaw = {
  id: string;
  backlogItemId: string;
  teamId: string;
  createdById: string;
  motivation: string;
  proposalText: string | null;
  proposalFileId: string | null;
  status: ProgramBTeamApplicationStatus;
  submittedAt: Date;
  withdrawnAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  cvAttachments: Array<{
    id: string;
    teamMemberUserId: string;
    uploadedFileId: string;
    uploadedFile: {
      id: string;
      originalName: string;
      mimeType: string;
      size: number;
    };
  }>;
};

export function toProgramBTeamApplicationResponseDto(
  application: ApplicationRaw,
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

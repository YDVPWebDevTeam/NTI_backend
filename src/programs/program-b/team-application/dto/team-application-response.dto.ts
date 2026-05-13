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

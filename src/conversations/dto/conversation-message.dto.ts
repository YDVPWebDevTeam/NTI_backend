import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationChannel, UploadStatus } from 'generated/prisma/enums';

export class ConversationUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;
}

export class ConversationMessageAttachmentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  fileId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  size!: number;

  @ApiProperty({ enum: UploadStatus })
  status!: UploadStatus;
}

export class ConversationMessageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ConversationChannel })
  channel!: ConversationChannel;

  @ApiProperty({ type: ConversationUserSummaryDto })
  author!: ConversationUserSummaryDto;

  @ApiProperty({
    description: 'Message body. Empty string when the message was deleted.',
  })
  body!: string;

  @ApiProperty({ type: [ConversationMessageAttachmentDto] })
  attachments!: ConversationMessageAttachmentDto[];

  @ApiProperty({
    description: 'True when the author has soft-deleted this message.',
  })
  isDeleted!: boolean;

  @ApiPropertyOptional({ nullable: true })
  editedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ConversationMessagePageMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ConversationMessagePageDto {
  @ApiProperty({ type: [ConversationMessageDto] })
  data!: ConversationMessageDto[];

  @ApiProperty({ type: ConversationMessagePageMetaDto })
  meta!: ConversationMessagePageMetaDto;
}

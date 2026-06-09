import { ApiProperty } from '@nestjs/swagger';

export class ConversationAttachmentDownloadDto {
  @ApiProperty({ format: 'uuid' })
  attachmentId!: string;

  @ApiProperty()
  downloadUrl!: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export const FILE_URL_DISPOSITIONS = ['inline', 'attachment'] as const;

export type FileUrlDisposition = (typeof FILE_URL_DISPOSITIONS)[number];

export class RequestDownloadUrlDto {
  @ApiPropertyOptional({
    description:
      'Controls how the browser should handle the file. Use inline for previews and attachment to force a download dialog.',
    enum: FILE_URL_DISPOSITIONS,
    default: 'inline',
    example: 'inline',
  })
  @IsOptional()
  @IsEnum(FILE_URL_DISPOSITIONS)
  disposition?: FileUrlDisposition;
}

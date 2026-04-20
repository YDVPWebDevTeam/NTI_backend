import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CompleteUploadDto {
  @ApiProperty({
    description: 'File record identifier returned by upload-url endpoint.',
    example: 'd8d89d76-1a4c-4cc8-b804-e7fcf58567af',
  })
  @IsUUID()
  fileId!: string;

  @ApiPropertyOptional({
    description: 'Client-observed object size in bytes.',
    example: 124_991,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  size?: number;

  @ApiPropertyOptional({
    description: 'Optional checksum for future integrity workflows.',
    example: 'sha256:abcd1234',
  })
  @IsOptional()
  @IsString()
  checksum?: string;
}

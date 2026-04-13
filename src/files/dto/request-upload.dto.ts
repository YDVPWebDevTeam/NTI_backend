import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FileVisibility } from '../../../generated/prisma/enums';

export const FILE_VISIBILITIES = Object.values(FileVisibility);
export type FileVisibilityDto = FileVisibility;

export class RequestUploadDto {
  @ApiProperty({
    description: 'Original file name from client.',
    example: 'avatar.png',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @ApiProperty({
    description: 'MIME type detected by the client.',
    example: 'image/png',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes.',
    example: 124_991,
  })
  @IsInt()
  @Min(1)
  size!: number;

  @ApiPropertyOptional({
    description:
      'Controls how the file will be read later. Use PUBLIC for files with a stable public URL such as avatars, and PRIVATE for files that should be opened through a short-lived signed URL.',
    enum: FILE_VISIBILITIES,
    default: 'PRIVATE',
    example: 'PRIVATE',
  })
  @IsOptional()
  @IsEnum(FILE_VISIBILITIES)
  visibility?: FileVisibilityDto;

  @ApiPropertyOptional({
    description: 'Logical upload purpose used in key generation.',
    example: 'avatar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  purpose?: string;

  @ApiPropertyOptional({
    description: 'Optional domain entity type this file belongs to.',
    example: 'user',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Optional domain entity id this file belongs to.',
    example: 'd8d89d76-1a4c-4cc8-b804-e7fcf58567af',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;
}

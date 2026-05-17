import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CompleteOrganizationDocumentUploadDto {
  @ApiPropertyOptional({
    description: 'Client-observed object size in bytes.',
    example: 1_048_576,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  sizeBytes?: number;

  @ApiPropertyOptional({
    description: 'Optional checksum resolved after upload.',
    example: 'sha256:abcd1234',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  checksum?: string;
}

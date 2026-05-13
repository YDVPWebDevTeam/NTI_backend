import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationDocumentVisibility } from 'generated/prisma/enums';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOrganizationDocumentUploadDto {
  @ApiProperty({
    description:
      'Logical document name used for versioning within the organization.',
    example: 'technical-spec.pdf',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Business classification of the document.',
    example: 'TECHNICAL_SPEC',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  documentType!: string;

  @ApiProperty({
    description: 'Client-detected MIME type.',
    example: 'application/pdf',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes.',
    example: 1_048_576,
  })
  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @ApiPropertyOptional({
    description: 'Optional checksum metadata for integrity tracking.',
    example: 'sha256:abcd1234',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  checksum?: string;

  @ApiPropertyOptional({
    enum: OrganizationDocumentVisibility,
    default: OrganizationDocumentVisibility.INTERNAL,
    example: OrganizationDocumentVisibility.INTERNAL,
  })
  @IsOptional()
  @IsEnum(OrganizationDocumentVisibility)
  visibility?: OrganizationDocumentVisibility;
}

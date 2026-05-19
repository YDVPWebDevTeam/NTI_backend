import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CompleteProgramBDocumentUploadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  checksum?: string;
}

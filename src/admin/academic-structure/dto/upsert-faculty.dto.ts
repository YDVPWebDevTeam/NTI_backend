import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateFacultyDto {
  @ApiProperty({ example: 'd8d89d76-1a4c-4cc8-b804-e7fcf58567af' })
  @IsUUID()
  universityId!: string;

  @ApiProperty({
    example: 'Faculty of Informatics and Information Technologies',
  })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'FIIT' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  shortName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFacultyDto extends PartialType(CreateFacultyDto) {}

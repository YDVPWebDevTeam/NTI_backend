import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUniversityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  shortName?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiProperty()
  isActive!: boolean;
}

export class AdminFacultyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  universityId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  shortName?: string;

  @ApiProperty()
  isActive!: boolean;
}

export class AdminSpecializationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  facultyId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  code?: string;

  @ApiPropertyOptional()
  degreeLabel?: string;

  @ApiProperty()
  isActive!: boolean;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UniversityLookupDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  shortName?: string;
}

export class FacultyLookupDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  shortName?: string;
}

export class SpecializationLookupDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  code?: string;

  @ApiPropertyOptional()
  degreeLabel?: string;
}

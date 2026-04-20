import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DegreeLevel, StudentStudyMode } from '../../../generated/prisma/enums';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const CURRENT_YEAR = new Date().getFullYear();

export class UpdateAcademicInformationDto {
  @ApiProperty({ example: 'd8d89d76-1a4c-4cc8-b804-e7fcf58567af' })
  @IsUUID()
  universityId!: string;

  @ApiProperty({ example: 'd8d89d76-1a4c-4cc8-b804-e7fcf58567af' })
  @IsUUID()
  facultyId!: string;

  @ApiProperty({ example: 'd8d89d76-1a4c-4cc8-b804-e7fcf58567af' })
  @IsUUID()
  specializationId!: string;

  @ApiProperty({ enum: DegreeLevel, example: DegreeLevel.BACHELOR })
  @IsEnum(DegreeLevel)
  degreeLevel!: DegreeLevel;

  @ApiPropertyOptional({
    enum: StudentStudyMode,
    example: StudentStudyMode.FULL_TIME,
  })
  @IsOptional()
  @IsEnum(StudentStudyMode)
  studyMode?: StudentStudyMode;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(8)
  studyYear!: number;

  @ApiPropertyOptional({ example: CURRENT_YEAR + 1 })
  @IsOptional()
  @IsInt()
  @Min(CURRENT_YEAR)
  @Max(CURRENT_YEAR + 10)
  expectedGraduationYear?: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  hasTransferredSubjects!: boolean;

  @ApiPropertyOptional({ example: 2 })
  @ValidateIf((dto: UpdateAcademicInformationDto) => dto.hasTransferredSubjects)
  @IsInt()
  @Min(1)
  transferredSubjectsCount?: number;

  @ApiPropertyOptional({ example: 1.7 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  profileSubjectsAverage?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['Databases', 'Software Engineering'],
    maxItems: 20,
  })
  @IsOptional()
  @IsArray()
  @MaxLength(100, { each: true })
  relevantCourses?: string[];

  @ApiPropertyOptional({ example: 'Hackathon finalist' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  academicAchievements?: string;

  @ApiPropertyOptional({
    example: 'd8d89d76-1a4c-4cc8-b804-e7fcf58567af',
  })
  @IsOptional()
  @IsUUID()
  academicEvidenceFileId?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  academicDeclarationAccepted!: boolean;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StudentFocusArea,
  StudentPreferredRole,
  StudentSkillLevel,
  StudentSoftSkill,
} from '../../../generated/prisma/enums';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProfessionalSkillInputDto {
  @ApiProperty({ example: 'React' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: StudentSkillLevel, example: StudentSkillLevel.ADVANCED })
  @IsEnum(StudentSkillLevel)
  level!: StudentSkillLevel;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  experienceMonths?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ProfessionalProjectInputDto {
  @ApiProperty({ example: 'Task Manager App' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'Web app for task and team management.' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  description!: string;

  @ApiProperty({ example: 'Frontend Developer' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  role!: string;

  @ApiPropertyOptional({ type: [String], example: ['React', 'TypeScript'] })
  @IsOptional()
  @IsArray()
  @MaxLength(100, { each: true })
  technologies?: string[];

  @ApiPropertyOptional({ example: 'https://example.dev/task-manager' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  projectUrl?: string;
}

export class UpdateProfessionalSkillsDto {
  @ApiProperty({
    type: [String],
    enum: StudentFocusArea,
    minItems: 1,
    maxItems: 3,
    example: [StudentFocusArea.WEB_APPLICATIONS],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsEnum(StudentFocusArea, { each: true })
  focusAreas!: StudentFocusArea[];

  @ApiProperty({
    type: [String],
    enum: StudentPreferredRole,
    minItems: 1,
    example: [StudentPreferredRole.FRONTEND],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(StudentPreferredRole, { each: true })
  preferredRoles!: StudentPreferredRole[];

  @ApiPropertyOptional({
    type: [String],
    enum: StudentSoftSkill,
    example: [StudentSoftSkill.TEAMWORK],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(StudentSoftSkill, { each: true })
  softSkills?: StudentSoftSkill[];

  @ApiPropertyOptional({ example: 'https://github.com/example' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  githubUrl?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/example' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.dev' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: 'Frontend-focused full-stack student' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiProperty({ example: 'd8d89d76-1a4c-4cc8-b804-e7fcf58567af' })
  @IsUUID()
  cvFileId!: string;

  @ApiProperty({
    type: [ProfessionalSkillInputDto],
    minItems: 1,
    maxItems: 30,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProfessionalSkillInputDto)
  skills!: ProfessionalSkillInputDto[];

  @ApiPropertyOptional({
    type: [ProfessionalProjectInputDto],
    maxItems: 5,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ProfessionalProjectInputDto)
  projects?: ProfessionalProjectInputDto[];
}

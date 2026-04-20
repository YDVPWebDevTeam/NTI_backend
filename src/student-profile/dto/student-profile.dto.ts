import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DegreeLevel,
  StudentFocusArea,
  StudentPreferredRole,
  StudentSkillLevel,
  StudentSoftSkill,
  StudentStudyMode,
} from '../../../generated/prisma/enums';

export class StudentProfileUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;
}

export class StudentProfileDataDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  universityId!: string;

  @ApiProperty()
  facultyId!: string;

  @ApiProperty()
  specializationId!: string;

  @ApiProperty({ enum: DegreeLevel })
  degreeLevel!: DegreeLevel;

  @ApiPropertyOptional({ enum: StudentStudyMode })
  studyMode?: StudentStudyMode;

  @ApiProperty()
  studyYear!: number;

  @ApiPropertyOptional()
  expectedGraduationYear?: number;

  @ApiPropertyOptional()
  hasTransferredSubjects?: boolean;

  @ApiPropertyOptional()
  transferredSubjectsCount?: number;

  @ApiPropertyOptional()
  profileSubjectsAverage?: number;

  @ApiProperty({ type: [String] })
  relevantCourses!: string[];

  @ApiPropertyOptional()
  academicAchievements?: string;

  @ApiPropertyOptional()
  academicEvidenceFileId?: string;

  @ApiPropertyOptional()
  academicDeclarationAcceptedAt?: string;

  @ApiProperty({ type: [String], enum: StudentFocusArea })
  focusAreas!: StudentFocusArea[];

  @ApiProperty({ type: [String], enum: StudentPreferredRole })
  preferredRoles!: StudentPreferredRole[];

  @ApiProperty({ type: [String], enum: StudentSoftSkill })
  softSkills!: StudentSoftSkill[];

  @ApiPropertyOptional()
  githubUrl?: string;

  @ApiPropertyOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  portfolioUrl?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  cvFileId?: string;

  @ApiPropertyOptional()
  profileCompletedAt?: string;
}

export class StudentSkillDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: StudentSkillLevel })
  level!: StudentSkillLevel;

  @ApiPropertyOptional()
  experienceMonths?: number;

  @ApiProperty()
  isPrimary!: boolean;
}

export class StudentProjectDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ type: [String] })
  technologies!: string[];

  @ApiPropertyOptional()
  projectUrl?: string;
}

export class StudentProfileCompletionDto {
  @ApiProperty()
  academicInformationCompleted!: boolean;

  @ApiProperty()
  professionalSkillsCompleted!: boolean;

  @ApiProperty()
  profileCompleted!: boolean;
}

export class GetMyStudentProfileResponseDto {
  @ApiProperty({ type: StudentProfileUserDto })
  user!: StudentProfileUserDto;

  @ApiPropertyOptional({ type: StudentProfileDataDto, nullable: true })
  profile!: StudentProfileDataDto | null;

  @ApiProperty({ type: [StudentSkillDto] })
  skills!: StudentSkillDto[];

  @ApiProperty({ type: [StudentProjectDto] })
  projects!: StudentProjectDto[];

  @ApiProperty({ type: StudentProfileCompletionDto })
  completion!: StudentProfileCompletionDto;
}

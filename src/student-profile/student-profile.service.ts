import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UploadStatus } from '../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { GetMyStudentProfileResponseDto } from './dto/student-profile.dto';
import { UpdateAcademicInformationDto } from './dto/update-academic-information.dto';
import { UpdateProfessionalSkillsDto } from './dto/update-professional-skills.dto';
import {
  StudentProfileRepository,
  StudentProfileWithRelations,
} from './student-profile.repository';

@Injectable()
export class StudentProfileService {
  constructor(private readonly repository: StudentProfileRepository) {}

  async getMyProfile(
    authUser: AuthenticatedUserContext,
  ): Promise<GetMyStudentProfileResponseDto> {
    const user = await this.repository.findUserIdentityById(authUser.id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.repository.findByUserIdWithRelations(
      authUser.id,
    );

    if (!profile) {
      return {
        user,
        profile: null,
        skills: [],
        projects: [],
        completion: {
          academicInformationCompleted: false,
          professionalSkillsCompleted: false,
          profileCompleted: false,
        },
      };
    }

    return this.toMyProfileResponse(profile);
  }

  async updateAcademicInformation(
    authUser: AuthenticatedUserContext,
    dto: UpdateAcademicInformationDto,
  ): Promise<GetMyStudentProfileResponseDto> {
    await this.validateAcademicHierarchy(dto);

    if (!dto.academicDeclarationAccepted) {
      throw new UnprocessableEntityException(
        'Academic declaration must be accepted',
      );
    }

    if (dto.academicEvidenceFileId) {
      await this.ensureUploadedFileOwnership(
        authUser.id,
        dto.academicEvidenceFileId,
      );
    }

    const profile = await this.repository.upsertAcademicInformation(
      authUser.id,
      dto,
    );

    return this.toMyProfileResponse(profile);
  }

  async updateProfessionalSkills(
    authUser: AuthenticatedUserContext,
    dto: UpdateProfessionalSkillsDto,
  ): Promise<GetMyStudentProfileResponseDto> {
    await this.ensureUploadedFileOwnership(authUser.id, dto.cvFileId);

    if (!dto.skills.some((skill) => skill.isPrimary === true)) {
      throw new UnprocessableEntityException(
        'At least one skill must be marked as primary',
      );
    }

    const profile = await this.repository.transaction(async (db) => {
      try {
        return await this.repository.replaceProfessionalSkills(
          authUser.id,
          dto,
          db,
        );
      } catch (error) {
        if (this.isProfileNotFoundError(error)) {
          throw new UnprocessableEntityException(
            'Academic information must be completed before professional skills',
          );
        }

        throw error;
      }
    });

    return this.toMyProfileResponse(profile);
  }

  async completeProfile(
    authUser: AuthenticatedUserContext,
  ): Promise<GetMyStudentProfileResponseDto> {
    const profile = await this.repository.findByUserIdWithRelations(
      authUser.id,
    );

    if (!profile) {
      throw new UnprocessableEntityException('Profile is incomplete');
    }

    const academicCompleted = this.isAcademicCompleted(profile);
    const professionalCompleted = this.isProfessionalCompleted(profile);

    if (!academicCompleted || !professionalCompleted) {
      throw new UnprocessableEntityException('Profile is incomplete');
    }

    const completedProfile = await this.repository.markCompleted(authUser.id);

    return this.toMyProfileResponse(completedProfile);
  }

  private async validateAcademicHierarchy(
    dto: Pick<
      UpdateAcademicInformationDto,
      'universityId' | 'facultyId' | 'specializationId'
    >,
  ): Promise<void> {
    const [university, faculty, specialization] = await Promise.all([
      this.repository.findUniversityById(dto.universityId),
      this.repository.findFacultyById(dto.facultyId),
      this.repository.findSpecializationById(dto.specializationId),
    ]);

    if (!university) {
      throw new BadRequestException('Selected university does not exist');
    }

    if (!faculty) {
      throw new BadRequestException('Selected faculty does not exist');
    }

    if (!specialization) {
      throw new BadRequestException('Selected specialization does not exist');
    }

    if (!university.isActive) {
      throw new BadRequestException('Selected university is not active');
    }

    if (!faculty.isActive) {
      throw new BadRequestException('Selected faculty is not active');
    }

    if (!specialization.isActive) {
      throw new BadRequestException('Selected specialization is not active');
    }

    if (faculty.universityId !== dto.universityId) {
      throw new BadRequestException(
        'Selected faculty does not belong to selected university',
      );
    }

    if (specialization.facultyId !== dto.facultyId) {
      throw new BadRequestException(
        'Selected specialization does not belong to selected faculty',
      );
    }
  }

  private async ensureUploadedFileOwnership(
    ownerId: string,
    fileId: string,
  ): Promise<void> {
    const file = await this.repository.findUploadedFileForOwner(
      fileId,
      ownerId,
    );

    if (!file) {
      throw new BadRequestException(
        'File does not exist or does not belong to user',
      );
    }

    if (file.status !== UploadStatus.UPLOADED) {
      throw new BadRequestException(
        'File must be uploaded before being attached',
      );
    }
  }

  private toMyProfileResponse(
    profile: StudentProfileWithRelations,
  ): GetMyStudentProfileResponseDto {
    return {
      user: profile.user,
      profile: {
        id: profile.id,
        universityId: profile.universityId,
        facultyId: profile.facultyId,
        specializationId: profile.specializationId,
        degreeLevel: profile.degreeLevel,
        studyMode: profile.studyMode ?? undefined,
        studyYear: profile.studyYear,
        expectedGraduationYear: profile.expectedGraduationYear ?? undefined,
        hasTransferredSubjects: profile.hasTransferredSubjects ?? undefined,
        transferredSubjectsCount: profile.transferredSubjectsCount ?? undefined,
        profileSubjectsAverage: profile.profileSubjectsAverage ?? undefined,
        relevantCourses: profile.relevantCourses,
        academicAchievements: profile.academicAchievements ?? undefined,
        academicEvidenceFileId: profile.academicEvidenceFileId ?? undefined,
        academicDeclarationAcceptedAt:
          profile.academicDeclarationAcceptedAt?.toISOString(),
        focusAreas: profile.focusAreas,
        preferredRoles: profile.preferredRoles,
        softSkills: profile.softSkills,
        githubUrl: profile.githubUrl ?? undefined,
        linkedinUrl: profile.linkedinUrl ?? undefined,
        portfolioUrl: profile.portfolioUrl ?? undefined,
        bio: profile.bio ?? undefined,
        cvFileId: profile.cvFileId ?? undefined,
        profileCompletedAt: profile.profileCompletedAt?.toISOString(),
      },
      skills: profile.skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        level: skill.level,
        experienceMonths: skill.experienceMonths ?? undefined,
        isPrimary: skill.isPrimary,
      })),
      projects: profile.projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        role: project.role,
        technologies: project.technologies,
        projectUrl: project.projectUrl ?? undefined,
      })),
      completion: {
        academicInformationCompleted: this.isAcademicCompleted(profile),
        professionalSkillsCompleted: this.isProfessionalCompleted(profile),
        profileCompleted: profile.profileCompletedAt !== null,
      },
    };
  }

  private isAcademicCompleted(profile: StudentProfileWithRelations): boolean {
    return (
      profile.universityId.length > 0 &&
      profile.facultyId.length > 0 &&
      profile.specializationId.length > 0 &&
      profile.studyYear > 0 &&
      profile.academicDeclarationAcceptedAt !== null
    );
  }

  private isProfessionalCompleted(
    profile: StudentProfileWithRelations,
  ): boolean {
    return (
      profile.focusAreas.length > 0 &&
      profile.preferredRoles.length > 0 &&
      profile.cvFileId !== null &&
      profile.skills.length > 0
    );
  }

  private isProfileNotFoundError(error: unknown): boolean {
    return error instanceof Error && error.message === 'PROFILE_NOT_FOUND';
  }
}

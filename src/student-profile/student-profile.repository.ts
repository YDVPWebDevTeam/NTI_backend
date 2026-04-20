import { Injectable } from '@nestjs/common';
import {
  Prisma,
  StudentProfile,
  UploadStatus,
} from '../../generated/prisma/client';
import {
  BaseRepository,
  PrismaDbClient,
  PrismaService,
} from '../infrastructure/database';
import { UpdateAcademicInformationDto } from './dto/update-academic-information.dto';
import { UpdateProfessionalSkillsDto } from './dto/update-professional-skills.dto';

const studentProfileInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  skills: {
    orderBy: {
      createdAt: 'asc',
    },
  },
  projects: {
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.StudentProfileInclude;

export type StudentProfileWithRelations = Prisma.StudentProfileGetPayload<{
  include: typeof studentProfileInclude;
}>;

@Injectable()
export class StudentProfileRepository extends BaseRepository<
  StudentProfile,
  Prisma.StudentProfileUncheckedCreateInput,
  Prisma.StudentProfileUncheckedUpdateInput,
  Prisma.StudentProfileWhereInput,
  Prisma.StudentProfileWhereUniqueInput,
  Prisma.StudentProfileOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).studentProfile;
  }

  findByUserIdWithRelations(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<StudentProfileWithRelations | null> {
    return (db ?? this.prisma.client).studentProfile.findUnique({
      where: { userId },
      include: studentProfileInclude,
    });
  }

  findUserIdentityById(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null> {
    return (db ?? this.prisma.client).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
  }

  findFacultyById(
    facultyId: string,
    db?: PrismaDbClient,
  ): Promise<{ id: string; universityId: string; isActive: boolean } | null> {
    return (db ?? this.prisma.client).faculty.findUnique({
      where: { id: facultyId },
      select: {
        id: true,
        universityId: true,
        isActive: true,
      },
    });
  }

  findUniversityById(
    universityId: string,
    db?: PrismaDbClient,
  ): Promise<{ id: string; isActive: boolean } | null> {
    return (db ?? this.prisma.client).university.findUnique({
      where: { id: universityId },
      select: {
        id: true,
        isActive: true,
      },
    });
  }

  findSpecializationById(
    specializationId: string,
    db?: PrismaDbClient,
  ): Promise<{ id: string; facultyId: string; isActive: boolean } | null> {
    return (db ?? this.prisma.client).specialization.findUnique({
      where: { id: specializationId },
      select: {
        id: true,
        facultyId: true,
        isActive: true,
      },
    });
  }

  findUploadedFileForOwner(
    fileId: string,
    ownerId: string,
    db?: PrismaDbClient,
  ): Promise<{ id: string; status: UploadStatus } | null> {
    return (db ?? this.prisma.client).uploadedFile.findFirst({
      where: {
        id: fileId,
        ownerId,
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  async upsertAcademicInformation(
    userId: string,
    dto: UpdateAcademicInformationDto,
    db?: PrismaDbClient,
  ): Promise<StudentProfileWithRelations> {
    const client = db ?? this.prisma.client;
    const relevantCourses = dto.relevantCourses?.map((course) => course.trim());
    const existingProfile = await client.studentProfile.findUnique({
      where: { userId },
      select: { academicDeclarationAcceptedAt: true },
    });

    const academicData: Prisma.StudentProfileUncheckedUpdateInput = {
      universityId: dto.universityId,
      facultyId: dto.facultyId,
      specializationId: dto.specializationId,
      degreeLevel: dto.degreeLevel,
      studyMode: dto.studyMode,
      studyYear: dto.studyYear,
      expectedGraduationYear: dto.expectedGraduationYear,
      hasTransferredSubjects: dto.hasTransferredSubjects,
      transferredSubjectsCount: dto.hasTransferredSubjects
        ? dto.transferredSubjectsCount
        : null,
      profileSubjectsAverage: dto.profileSubjectsAverage,
      academicAchievements: dto.academicAchievements?.trim(),
      academicEvidenceFileId: dto.academicEvidenceFileId,
    };

    if (relevantCourses !== undefined) {
      academicData.relevantCourses = relevantCourses;
    }

    if (
      dto.academicDeclarationAccepted &&
      existingProfile?.academicDeclarationAcceptedAt === null
    ) {
      academicData.academicDeclarationAcceptedAt = new Date();
    }

    const profile = await client.studentProfile.upsert({
      where: {
        userId,
      },
      create: {
        userId,
        universityId: dto.universityId,
        facultyId: dto.facultyId,
        specializationId: dto.specializationId,
        degreeLevel: dto.degreeLevel,
        studyMode: dto.studyMode,
        studyYear: dto.studyYear,
        expectedGraduationYear: dto.expectedGraduationYear,
        hasTransferredSubjects: dto.hasTransferredSubjects,
        transferredSubjectsCount: dto.hasTransferredSubjects
          ? dto.transferredSubjectsCount
          : null,
        profileSubjectsAverage: dto.profileSubjectsAverage,
        relevantCourses: relevantCourses ?? [],
        academicAchievements: dto.academicAchievements?.trim(),
        academicEvidenceFileId: dto.academicEvidenceFileId,
        academicDeclarationAcceptedAt: dto.academicDeclarationAccepted
          ? new Date()
          : null,
      },
      update: academicData,
      include: studentProfileInclude,
    });

    return profile;
  }

  async replaceProfessionalSkills(
    userId: string,
    dto: UpdateProfessionalSkillsDto,
    db?: PrismaDbClient,
  ): Promise<StudentProfileWithRelations> {
    const client = db ?? this.prisma.client;

    const profile = await client.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    await client.studentProfile.update({
      where: { userId },
      data: {
        focusAreas: dto.focusAreas,
        preferredRoles: dto.preferredRoles,
        softSkills: dto.softSkills ?? [],
        githubUrl: dto.githubUrl?.trim(),
        linkedinUrl: dto.linkedinUrl?.trim(),
        portfolioUrl: dto.portfolioUrl?.trim(),
        bio: dto.bio?.trim(),
        cvFileId: dto.cvFileId,
      },
    });

    await client.studentSkill.deleteMany({
      where: {
        studentProfileId: profile.id,
      },
    });

    await client.studentProject.deleteMany({
      where: {
        studentProfileId: profile.id,
      },
    });

    if (dto.skills.length > 0) {
      await client.studentSkill.createMany({
        data: dto.skills.map((skill) => ({
          studentProfileId: profile.id,
          name: skill.name.trim(),
          level: skill.level,
          experienceMonths: skill.experienceMonths,
          isPrimary: skill.isPrimary ?? false,
        })),
      });
    }

    if (dto.projects && dto.projects.length > 0) {
      await client.studentProject.createMany({
        data: dto.projects.map((project) => ({
          studentProfileId: profile.id,
          title: project.title.trim(),
          description: project.description.trim(),
          role: project.role.trim(),
          technologies: (project.technologies ?? []).map((item) => item.trim()),
          projectUrl: project.projectUrl?.trim(),
        })),
      });
    }

    return this.findByUserIdWithRelationsOrThrow(userId, client);
  }

  async markCompleted(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<StudentProfileWithRelations> {
    await (db ?? this.prisma.client).studentProfile.update({
      where: { userId },
      data: {
        profileCompletedAt: new Date(),
      },
    });

    return this.findByUserIdWithRelationsOrThrow(userId, db);
  }

  private async findByUserIdWithRelationsOrThrow(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<StudentProfileWithRelations> {
    const profile = await this.findByUserIdWithRelations(userId, db);

    if (!profile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    return profile;
  }
}

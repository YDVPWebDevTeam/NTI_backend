import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import type {
  ApplicationSection,
  ApplicationSectionHistory,
  Prisma,
} from '../../generated/prisma/client';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { PrismaDbClient } from '../infrastructure/database';
import { ApplicationSectionsRepository } from './application-sections.repository';
import {
  ApplicationWithRelations,
  ApplicationsRepository,
} from './applications.repository';
import { ApplicationSectionDto } from './dto/application-section.dto';
import { ApplicationSectionHistoryDto } from './dto/application-section-history.dto';
import { SetActiveSectionVersionDto } from './dto/set-active-section-version.dto';
import { UpsertApplicationSectionDto } from './dto/upsert-application-section.dto';

@Injectable()
export class ApplicationSectionsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly sectionsRepository: ApplicationSectionsRepository,
  ) {}

  async listSections(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionDto[]> {
    const application =
      await this.applicationsRepository.findByIdWithRelations(applicationId);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    this.assertReadAccess(application, user);

    const sections =
      await this.sectionsRepository.findByApplicationId(applicationId);

    return Promise.all(sections.map((section) => this.toSectionDto(section)));
  }

  async upsertSection(
    applicationId: string,
    key: string,
    dto: UpsertApplicationSectionDto,
    user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionDto> {
    return this.applicationsRepository.transaction(async (db) => {
      const application =
        await this.applicationsRepository.findByIdWithRelations(
          applicationId,
          db,
        );

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      this.assertWriteAccess(application, user);
      this.assertSectionStructure(key, dto.valueJson);

      const section = await this.sectionsRepository.upsertSection(
        applicationId,
        key,
        dto.valueJson as Prisma.InputJsonValue,
        user.id,
        db,
      );

      await this.sectionsRepository.createHistoryEntry(
        section.id,
        section.version,
        dto.valueJson as Prisma.InputJsonValue,
        user.id,
        db,
      );

      return this.toSectionDto(section, db);
    });
  }

  async getSectionHistory(
    applicationId: string,
    key: string,
    user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionHistoryDto[]> {
    const application =
      await this.applicationsRepository.findByIdWithRelations(applicationId);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    this.assertAdminAccess(user);

    const section = await this.sectionsRepository.findByApplicationIdAndKey(
      applicationId,
      key,
    );

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const history = await this.sectionsRepository.findHistoryBySectionId(
      section.id,
    );

    return history.map((row) => this.toHistoryDto(row));
  }

  async setActiveVersion(
    applicationId: string,
    key: string,
    dto: SetActiveSectionVersionDto,
    user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionDto> {
    return this.applicationsRepository.transaction(async (db) => {
      const application =
        await this.applicationsRepository.findByIdWithRelations(
          applicationId,
          db,
        );

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      this.assertAdminAccess(user);

      const section = await this.sectionsRepository.findByApplicationIdAndKey(
        applicationId,
        key,
        db,
      );

      if (!section) {
        throw new NotFoundException('Section not found');
      }

      if (dto.version !== null) {
        const historyEntry = await this.sectionsRepository.findHistoryEntry(
          section.id,
          dto.version,
          db,
        );

        if (!historyEntry) {
          throw new BadRequestException('Version not found in history');
        }
      }

      await this.sectionsRepository.setActiveVersion(
        section.id,
        dto.version,
        db,
      );

      const updatedSection =
        await this.sectionsRepository.findByApplicationIdAndKey(
          applicationId,
          key,
          db,
        );

      if (!updatedSection) {
        throw new NotFoundException('Section not found');
      }

      return this.toSectionDto(updatedSection, db);
    });
  }

  private async toSectionDto(
    row: ApplicationSection,
    db?: PrismaDbClient,
  ): Promise<ApplicationSectionDto> {
    const activeHistory =
      row.activeVersion === null
        ? null
        : await this.sectionsRepository.findHistoryEntry(
            row.id,
            row.activeVersion,
            db,
          );

    return {
      id: row.id,
      applicationId: row.applicationId,
      key: row.key,
      valueJson: activeHistory?.valueJson ?? row.valueJson,
      version: row.version,
      activeVersion: row.activeVersion,
      updatedById: row.updatedById,
      updatedAt: row.updatedAt,
    };
  }

  private toHistoryDto(
    row: ApplicationSectionHistory,
  ): ApplicationSectionHistoryDto {
    return {
      id: row.id,
      sectionId: row.sectionId,
      version: row.version,
      valueJson: row.valueJson,
      savedById: row.savedById,
      createdAt: row.createdAt,
    };
  }

  private assertSectionStructure(
    key: string,
    valueJson: Record<string, unknown>,
  ): void {
    const validator = this.getSectionStructureValidator(key);

    if (!validator) {
      return;
    }

    validator(valueJson);
  }

  private getSectionStructureValidator(
    key: string,
  ): ((valueJson: Record<string, unknown>) => void) | null {
    switch (key) {
      default:
        return null;
    }
  }

  private assertReadAccess(
    application: ApplicationWithRelations,
    user: AuthenticatedUserContext,
  ): void {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    const isTeamMember =
      application.team.leaderId === user.id ||
      application.team.members?.some((member) => member.userId === user.id);

    if (!isTeamMember) {
      throw new ForbiddenException(
        'You do not have permission to view this application',
      );
    }
  }

  private assertWriteAccess(
    application: ApplicationWithRelations,
    user: AuthenticatedUserContext,
  ): void {
    if (application.team.leaderId !== user.id) {
      throw new ForbiddenException(
        'Only team lead can update application sections',
      );
    }
  }

  private assertAdminAccess(user: AuthenticatedUserContext): void {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }
}

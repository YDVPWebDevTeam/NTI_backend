import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ApplicationSection,
  ApplicationSectionHistory,
  Prisma,
} from '../../generated/prisma/client';
import { ProgramType } from '../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { PrismaDbClient } from '../infrastructure/database';
import { ApplicationSectionsRepository } from './application-sections.repository';
import { ApplicationsRepository } from './applications.repository';
import { ApplicationSectionDto } from './dto/application-section.dto';
import { ApplicationSectionHistoryDto } from './dto/application-section-history.dto';
import {
  APPLICATION_SECTION_KEYS,
  type ApplicationSectionKey,
} from './dto/application-section-key.constants';
import {
  type ApplicationProfileSectionValue,
  ApplicationProfileSectionValueDto,
} from './dto/application-profile-section-value.dto';
import { SetActiveSectionVersionDto } from './dto/set-active-section-version.dto';
import { UpsertApplicationSectionDto } from './dto/upsert-application-section.dto';
import {
  assertProgramASectionKey,
  PROGRAM_A_SECTION_KEYS,
  validateProgramASectionPayload,
} from './program-a/program-a-application-sections.contract';
import { ApplicationSectionsRulesService } from './rules/application-sections-rules.service';

@Injectable()
export class ApplicationSectionsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly sectionsRepository: ApplicationSectionsRepository,
    private readonly sectionsRules: ApplicationSectionsRulesService,
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

    this.sectionsRules.assertReadAccess(application, user);

    const sections =
      await this.sectionsRepository.findByApplicationId(applicationId);

    const activePairs = sections
      .filter((section) => section.activeVersion !== null)
      .map((section) => ({
        sectionId: section.id,
        version: section.activeVersion as number,
      }));

    const historyEntries =
      await this.sectionsRepository.findHistoryEntriesBulk(activePairs);

    const historyMap = new Map(
      historyEntries.map((historyEntry) => [
        `${historyEntry.sectionId}:${historyEntry.version}`,
        historyEntry,
      ]),
    );

    return sections.map((section) => {
      const activeHistory =
        section.activeVersion === null
          ? null
          : (historyMap.get(`${section.id}:${section.activeVersion}`) ?? null);

      return this.mapSectionToDto(section, activeHistory);
    });
  }

  async upsertSection(
    applicationId: string,
    key: ApplicationSectionKey,
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

      this.sectionsRules.assertApplicationIsDraft(application.status);
      this.sectionsRules.assertWriteAccess(application, user);

      if (application.call.type !== ProgramType.PROGRAM_A) {
        throw new ConflictException(
          'Application sections are currently supported only for Program A applications',
        );
      }

      this.assertSectionStructure(
        key,
        dto.valueJson as unknown as Record<string, unknown>,
      );

      const section = await this.sectionsRepository.upsertSection(
        applicationId,
        key,
        dto.valueJson as unknown as Prisma.InputJsonValue,
        user.id,
        db,
      );

      await this.sectionsRepository.createHistoryEntry(
        section.id,
        section.version,
        dto.valueJson as unknown as Prisma.InputJsonValue,
        user.id,
        db,
      );

      const updatedSection = await this.sectionsRepository.setActiveVersion(
        section.id,
        section.version,
        db,
      );

      return this.toSectionDto(updatedSection, db);
    });
  }

  async getSectionHistory(
    applicationId: string,
    key: ApplicationSectionKey,
    user: AuthenticatedUserContext,
  ): Promise<ApplicationSectionHistoryDto[]> {
    const application =
      await this.applicationsRepository.findByIdWithRelations(applicationId);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    this.sectionsRules.assertAdminAccess(user);

    if (application.call.type === ProgramType.PROGRAM_A) {
      this.assertKnownProgramASectionKey(key);
    }

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
    key: ApplicationSectionKey,
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

      this.sectionsRules.assertAdminAccess(user);

      if (application.call.type === ProgramType.PROGRAM_A) {
        this.assertKnownProgramASectionKey(key);
      }

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

  private assertKnownProgramASectionKey(key: string): void {
    assertProgramASectionKey(key);
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

    return this.mapSectionToDto(row, activeHistory);
  }

  private toHistoryDto(
    row: ApplicationSectionHistory,
  ): ApplicationSectionHistoryDto {
    return {
      id: row.id,
      sectionId: row.sectionId,
      version: row.version,
      valueJson: row.valueJson as unknown as ApplicationProfileSectionValueDto,
      savedById: row.savedById,
      createdAt: row.createdAt,
    };
  }

  private mapSectionToDto(
    row: ApplicationSection,
    activeHistory: ApplicationSectionHistory | null,
  ): ApplicationSectionDto {
    this.assertSectionKey(row.key);

    const valueJson = (activeHistory?.valueJson ??
      row.valueJson) as unknown as Record<string, unknown>;

    return {
      id: row.id,
      applicationId: row.applicationId,
      key: row.key,
      valueJson: valueJson as unknown as ApplicationProfileSectionValueDto,
      version: row.version,
      activeVersion: row.activeVersion,
      updatedById: row.updatedById,
      updatedAt: row.updatedAt,
    };
  }

  private assertSectionStructure(
    key: ApplicationSectionKey,
    valueJson: Record<string, unknown>,
  ): void {
    this.assertSectionKey(key);

    if (key === APPLICATION_SECTION_KEYS.PROFILE) {
      this.assertProfileSectionValue(valueJson);
      return;
    }

    validateProgramASectionPayload(key, valueJson);
  }

  private assertSectionKey(key: string): asserts key is ApplicationSectionKey {
    if (key === APPLICATION_SECTION_KEYS.PROFILE) {
      return;
    }

    if (
      PROGRAM_A_SECTION_KEYS.includes(
        key as (typeof PROGRAM_A_SECTION_KEYS)[number],
      )
    ) {
      return;
    }

    throw new BadRequestException(
      `Unsupported application section key: ${key}`,
    );
  }

  private assertProfileSectionValue(
    valueJson: Record<string, unknown>,
  ): asserts valueJson is ApplicationProfileSectionValue {
    const keys = Object.keys(valueJson);

    if (
      keys.length !== 1 ||
      !keys.includes('name') ||
      typeof valueJson.name !== 'string' ||
      valueJson.name.trim().length === 0
    ) {
      throw new BadRequestException(
        'Profile section payload must be an object with a non-empty string "name" field.',
      );
    }
  }
}

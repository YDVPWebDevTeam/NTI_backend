import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaDbClient } from '../infrastructure/database';
import { ApplicationsRepository } from './applications.repository';
import { EligibilitySignalDto } from './dto/eligibility-signal.dto';
import { EligibilitySignalsRepository } from './eligibility-signals.repository';

export const ELIGIBILITY_SIGNAL_CODES = [
  'TEAM_SIZE_MIN',
  'DECLARATION_PRESENT',
  'ACADEMIC_EVIDENCE_PRESENT',
] as const;

type EligibilitySignalCode = (typeof ELIGIBILITY_SIGNAL_CODES)[number];

type SignalResult = {
  code: EligibilitySignalCode;
  passed: boolean;
  reason: string | null;
};

@Injectable()
export class EligibilitySignalsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly eligibilitySignalsRepository: EligibilitySignalsRepository,
  ) {}

  async recomputeForApplication(
    applicationId: string,
    db?: PrismaDbClient,
  ): Promise<void> {
    const application =
      await this.applicationsRepository.findByIdForEligibility(
        applicationId,
        db,
      );

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const configs = await this.eligibilitySignalsRepository.getRuleConfigs(
      application.callId,
      db,
    );

    const configByCode = new Map(
      configs.map((config) => [config.code, config]),
    );

    const results: SignalResult[] = [
      this.computeTeamSizeMin(application, configByCode),
      this.computeDeclarationPresent(application),
      this.computeAcademicEvidencePresent(application),
    ];

    for (const result of results) {
      await this.eligibilitySignalsRepository.upsertSignal(
        application.id,
        result.code,
        result.passed,
        result.reason,
        db,
      );
    }
  }

  async recomputeForTeamApplications(
    teamId: string,
    db?: PrismaDbClient,
  ): Promise<void> {
    const applications =
      await this.eligibilitySignalsRepository.findActiveApplicationIdsByTeamId(
        teamId,
        db,
      );

    for (const application of applications) {
      await this.recomputeForApplication(application.id, db);
    }
  }

  async recomputeForStudentApplications(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<void> {
    const applications =
      await this.eligibilitySignalsRepository.findActiveApplicationIdsByStudentUserId(
        userId,
        db,
      );

    for (const application of applications) {
      await this.recomputeForApplication(application.id, db);
    }
  }

  async getSignalsForApplication(
    applicationId: string,
  ): Promise<EligibilitySignalDto[]> {
    const signals =
      await this.eligibilitySignalsRepository.findSignalsByApplicationId(
        applicationId,
      );

    const signalByCode = new Map(
      signals.map((signal) => [signal.code, signal]),
    );

    return ELIGIBILITY_SIGNAL_CODES.map((code) => {
      const signal = signalByCode.get(code);

      if (!signal) {
        return {
          code,
          passed: false,
          reason: 'Signal has not been computed yet.',
          createdAt: new Date(),
        };
      }

      return {
        code: signal.code,
        passed: signal.passed,
        reason: signal.reason,
        createdAt: signal.createdAt,
      };
    });
  }

  private computeTeamSizeMin(
    application: Awaited<
      ReturnType<ApplicationsRepository['findByIdForEligibility']>
    >,
    configByCode: Map<string, { threshold: string | null }>,
  ): SignalResult {
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const config = configByCode.get('TEAM_SIZE_MIN');
    const requiredMinimum = config?.threshold ? Number(config.threshold) : 2;

    const actualCount = application.team.members.length;
    const passed = actualCount >= requiredMinimum;

    return {
      code: 'TEAM_SIZE_MIN',
      passed,
      reason: passed
        ? null
        : `Team has ${actualCount} member(s), required minimum is ${requiredMinimum}.`,
    };
  }

  private computeDeclarationPresent(
    application: Awaited<
      ReturnType<ApplicationsRepository['findByIdForEligibility']>
    >,
  ): SignalResult {
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const missingMembers = application.team.members.filter(
      (member) =>
        member.user.studentProfile?.academicDeclarationAcceptedAt == null,
    );

    const passed = missingMembers.length === 0;

    return {
      code: 'DECLARATION_PRESENT',
      passed,
      reason: passed
        ? null
        : `Missing academic declaration for member(s): ${missingMembers
            .map((member) => member.user.email)
            .join(', ')}.`,
    };
  }

  private computeAcademicEvidencePresent(
    application: Awaited<
      ReturnType<ApplicationsRepository['findByIdForEligibility']>
    >,
  ): SignalResult {
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const missingMembers = application.team.members.filter(
      (member) => member.user.studentProfile?.academicEvidenceFileId == null,
    );

    const passed = missingMembers.length === 0;

    return {
      code: 'ACADEMIC_EVIDENCE_PRESENT',
      passed,
      reason: passed
        ? null
        : `Missing academic evidence for member(s): ${missingMembers
            .map((member) => member.user.email)
            .join(', ')}.`,
    };
  }
}

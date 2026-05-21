import { BadRequestException } from '@nestjs/common';

export const PROGRAM_A_SECTION_KEYS = [
  'idea_overview',
  'category_and_stack',
  'team_setup',
  'execution_plan',
  'business_case',
  'risks',
] as const;

export type ProgramASectionKey = (typeof PROGRAM_A_SECTION_KEYS)[number];

type ProgramASectionPayload = Record<string, unknown>;

function ensureSectionPayload(
  value: unknown,
  sectionKey: string,
): ProgramASectionPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${sectionKey} payload must be an object`);
  }

  return value as ProgramASectionPayload;
}

function ensureNonEmptyString(value: unknown, fieldPath: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${fieldPath} must be a non-empty string`);
  }

  return value;
}

function ensureNonEmptyStringArray(
  value: unknown,
  fieldPath: string,
): string[] {
  if (!isNonEmptyStringArray(value)) {
    throw new BadRequestException(
      `${fieldPath} must be an array of non-empty strings`,
    );
  }

  return value;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0)
  );
}

const PROGRAM_A_SECTION_VALIDATORS = {
  idea_overview(value) {
    const payload = ensureSectionPayload(value, 'idea_overview');
    ensureNonEmptyString(payload.problem, 'idea_overview.problem');
    ensureNonEmptyString(payload.solution, 'idea_overview.solution');
    ensureNonEmptyString(payload.targetUsers, 'idea_overview.targetUsers');
    ensureNonEmptyString(
      payload.valueProposition,
      'idea_overview.valueProposition',
    );
  },
  category_and_stack(value) {
    const payload = ensureSectionPayload(value, 'category_and_stack');
    ensureNonEmptyString(payload.category, 'category_and_stack.category');
    ensureNonEmptyStringArray(
      payload.stackTags,
      'category_and_stack.stackTags',
    );
  },
  team_setup(value) {
    const payload = ensureSectionPayload(value, 'team_setup');
    ensureNonEmptyString(payload.leaderRole, 'team_setup.leaderRole');
    ensureNonEmptyString(
      payload.memberResponsibilities,
      'team_setup.memberResponsibilities',
    );
  },
  execution_plan(value) {
    const payload = ensureSectionPayload(value, 'execution_plan');
    ensureNonEmptyString(
      payload.roadmapSummary,
      'execution_plan.roadmapSummary',
    );
    ensureNonEmptyString(
      payload.plannedMilestones,
      'execution_plan.plannedMilestones',
    );
    ensureNonEmptyString(
      payload.timelineSummary,
      'execution_plan.timelineSummary',
    );
  },
  business_case(value) {
    const payload = ensureSectionPayload(value, 'business_case');
    ensureNonEmptyString(payload.market, 'business_case.market');
    ensureNonEmptyString(payload.monetization, 'business_case.monetization');
    ensureNonEmptyString(
      payload.expectedImpact,
      'business_case.expectedImpact',
    );
  },
  risks(value) {
    const payload = ensureSectionPayload(value, 'risks');
    ensureNonEmptyString(payload.topRisks, 'risks.topRisks');
    ensureNonEmptyString(payload.mitigations, 'risks.mitigations');
  },
} satisfies Record<ProgramASectionKey, (value: unknown) => void>;

export function assertProgramASectionKey(
  key: string,
): asserts key is ProgramASectionKey {
  if (!Object.hasOwn(PROGRAM_A_SECTION_VALIDATORS, key)) {
    throw new BadRequestException(`Unsupported Program A section key: ${key}`);
  }
}

export function validateProgramASectionPayload(
  key: string,
  valueJson: unknown,
): void {
  assertProgramASectionKey(key);
  PROGRAM_A_SECTION_VALIDATORS[key](valueJson);
}

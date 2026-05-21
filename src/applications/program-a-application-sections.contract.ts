import { BadRequestException } from '@nestjs/common';

export const PROGRAM_A_APPLICATION_SECTION_KEYS = [
  'idea_overview',
  'category_and_stack',
  'team_setup',
  'execution_plan',
  'business_case',
  'risks',
] as const;

export type ProgramAApplicationSectionKey =
  (typeof PROGRAM_A_APPLICATION_SECTION_KEYS)[number];

const PROGRAM_A_APPLICATION_SECTION_KEY_SET = new Set<string>(
  PROGRAM_A_APPLICATION_SECTION_KEYS,
);

type SectionValidator = (value: Record<string, unknown>) => void;

export function isProgramAApplicationSectionKey(
  key: string,
): key is ProgramAApplicationSectionKey {
  return PROGRAM_A_APPLICATION_SECTION_KEY_SET.has(key);
}

export function validateProgramAApplicationSection(
  key: string,
  value: Record<string, unknown>,
): void {
  if (!isProgramAApplicationSectionKey(key)) {
    throw new BadRequestException(
      `Unsupported Program A application section key: ${key}`,
    );
  }

  PROGRAM_A_SECTION_VALIDATORS[key](value);
}

const PROGRAM_A_SECTION_VALIDATORS: Record<
  ProgramAApplicationSectionKey,
  SectionValidator
> = {
  idea_overview: (value) => {
    assertExactKeys(value, 'idea_overview', [
      'problem',
      'solution',
      'targetUsers',
      'valueProposition',
    ]);
    assertNonEmptyString(value, 'problem', 'idea_overview');
    assertNonEmptyString(value, 'solution', 'idea_overview');
    assertNonEmptyString(value, 'targetUsers', 'idea_overview');
    assertNonEmptyString(value, 'valueProposition', 'idea_overview');
  },
  category_and_stack: (value) => {
    assertExactKeys(value, 'category_and_stack', ['category', 'stackTags']);
    assertNonEmptyString(value, 'category', 'category_and_stack');
    assertNonEmptyStringArray(value, 'stackTags', 'category_and_stack');
  },
  team_setup: (value) => {
    assertExactKeys(value, 'team_setup', [
      'leaderRole',
      'memberResponsibilities',
    ]);
    assertNonEmptyString(value, 'leaderRole', 'team_setup');
    assertMemberResponsibilities(value.memberResponsibilities);
  },
  execution_plan: (value) => {
    assertExactKeys(value, 'execution_plan', [
      'roadmapSummary',
      'plannedMilestones',
      'timelineSummary',
    ]);
    assertNonEmptyString(value, 'roadmapSummary', 'execution_plan');
    assertNonEmptyStringArray(value, 'plannedMilestones', 'execution_plan');
    assertNonEmptyString(value, 'timelineSummary', 'execution_plan');
  },
  business_case: (value) => {
    assertExactKeys(value, 'business_case', [
      'market',
      'monetization',
      'expectedImpact',
    ]);
    assertNonEmptyString(value, 'market', 'business_case');
    assertNonEmptyString(value, 'monetization', 'business_case');
    assertNonEmptyString(value, 'expectedImpact', 'business_case');
  },
  risks: (value) => {
    assertExactKeys(value, 'risks', ['topRisks', 'mitigations']);
    assertNonEmptyStringArray(value, 'topRisks', 'risks');
    assertNonEmptyStringArray(value, 'mitigations', 'risks');
  },
};

function assertExactKeys(
  value: Record<string, unknown>,
  sectionKey: ProgramAApplicationSectionKey,
  expectedKeys: readonly string[],
): void {
  const actualKeys = Object.keys(value);
  const missingKeys = expectedKeys.filter((key) => !(key in value));
  const unknownKeys = actualKeys.filter((key) => !expectedKeys.includes(key));

  if (missingKeys.length > 0 || unknownKeys.length > 0) {
    const problems = [
      missingKeys.length > 0 ? `missing: ${missingKeys.join(', ')}` : null,
      unknownKeys.length > 0 ? `unknown: ${unknownKeys.join(', ')}` : null,
    ].filter(Boolean);

    throw new BadRequestException(
      `Invalid ${sectionKey} payload keys (${problems.join('; ')})`,
    );
  }
}

function assertNonEmptyString(
  value: Record<string, unknown>,
  field: string,
  sectionKey: ProgramAApplicationSectionKey,
): void {
  if (typeof value[field] !== 'string' || value[field].trim().length === 0) {
    throw new BadRequestException(
      `${sectionKey}.${field} must be a non-empty string`,
    );
  }
}

function assertNonEmptyStringArray(
  value: Record<string, unknown>,
  field: string,
  sectionKey: ProgramAApplicationSectionKey,
): void {
  const fieldValue = value[field];

  if (
    !Array.isArray(fieldValue) ||
    fieldValue.length === 0 ||
    fieldValue.some(
      (item) => typeof item !== 'string' || item.trim().length === 0,
    )
  ) {
    throw new BadRequestException(
      `${sectionKey}.${field} must be a non-empty array of non-empty strings`,
    );
  }
}

function assertMemberResponsibilities(value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestException(
      'team_setup.memberResponsibilities must be a non-empty array',
    );
  }

  for (const [index, item] of value.entries()) {
    if (!isPlainRecord(item)) {
      throw new BadRequestException(
        `team_setup.memberResponsibilities[${index}] must be an object`,
      );
    }

    assertExactKeys(item, 'team_setup', ['memberUserId', 'responsibility']);

    if (
      typeof item.memberUserId !== 'string' ||
      item.memberUserId.trim().length === 0
    ) {
      throw new BadRequestException(
        `team_setup.memberResponsibilities[${index}].memberUserId must be a non-empty string`,
      );
    }

    if (
      typeof item.responsibility !== 'string' ||
      item.responsibility.trim().length === 0
    ) {
      throw new BadRequestException(
        `team_setup.memberResponsibilities[${index}].responsibility must be a non-empty string`,
      );
    }
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

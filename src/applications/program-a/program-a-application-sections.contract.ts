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

export const REQUIRED_PROGRAM_A_SECTION_KEYS = PROGRAM_A_SECTION_KEYS;

export function isProgramASectionKey(key: string): key is ProgramASectionKey {
  return (PROGRAM_A_SECTION_KEYS as readonly string[]).includes(key);
}

function assertObject(
  value: unknown,
  sectionKey: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${sectionKey} payload must be an object`);
  }
}

function assertRequiredString(
  value: Record<string, unknown>,
  field: string,
  sectionKey: string,
): void {
  if (typeof value[field] !== 'string' || value[field].trim().length === 0) {
    throw new BadRequestException(
      `${sectionKey}.${field} must be a non-empty string`,
    );
  }
}

function assertStringArray(
  value: Record<string, unknown>,
  field: string,
  sectionKey: string,
  minItems = 1,
): void {
  const fieldValue = value[field];

  if (
    !Array.isArray(fieldValue) ||
    fieldValue.length < minItems ||
    !fieldValue.every(
      (item) => typeof item === 'string' && item.trim().length > 0,
    )
  ) {
    throw new BadRequestException(
      `${sectionKey}.${field} must be an array of non-empty strings`,
    );
  }
}

export function validateProgramASectionPayload(
  key: string,
  valueJson: Record<string, unknown>,
): void {
  if (!isProgramASectionKey(key)) {
    throw new BadRequestException(`Unsupported Program A section key: ${key}`);
  }

  assertObject(valueJson, key);

  switch (key) {
    case 'idea_overview':
      assertRequiredString(valueJson, 'problem', key);
      assertRequiredString(valueJson, 'solution', key);
      assertRequiredString(valueJson, 'targetUsers', key);
      assertRequiredString(valueJson, 'valueProposition', key);
      return;

    case 'category_and_stack':
      assertRequiredString(valueJson, 'category', key);
      assertStringArray(valueJson, 'stackTags', key);
      return;

    case 'team_setup':
      assertRequiredString(valueJson, 'leaderRole', key);
      assertRequiredString(valueJson, 'memberResponsibilities', key);
      return;

    case 'execution_plan':
      assertRequiredString(valueJson, 'roadmapSummary', key);
      assertRequiredString(valueJson, 'plannedMilestones', key);
      assertRequiredString(valueJson, 'timelineSummary', key);
      return;

    case 'business_case':
      assertRequiredString(valueJson, 'market', key);
      assertRequiredString(valueJson, 'monetization', key);
      assertRequiredString(valueJson, 'expectedImpact', key);
      return;

    case 'risks':
      assertRequiredString(valueJson, 'topRisks', key);
      assertRequiredString(valueJson, 'mitigations', key);
      return;
  }
}

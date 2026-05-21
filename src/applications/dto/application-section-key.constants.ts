export const APPLICATION_SECTION_KEYS = {
  PROFILE: 'profile',
  IDEA_OVERVIEW: 'idea_overview',
} as const;

export type ApplicationSectionKey =
  (typeof APPLICATION_SECTION_KEYS)[keyof typeof APPLICATION_SECTION_KEYS];

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const SORT_ORDER_VALUES = ['asc', 'desc'] as const;

export type SortOrder = (typeof SORT_ORDER_VALUES)[number];

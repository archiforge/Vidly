export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/** Stock levels at or below this (but above zero) are flagged as "low" on the dashboard. */
export const LOW_STOCK_THRESHOLD = 2;

export const MOVIE_LIMITS = {
  maxStock: 1000,
  maxDailyRate: 100,
} as const;

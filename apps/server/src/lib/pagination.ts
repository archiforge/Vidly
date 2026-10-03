import type { Paginated } from '@vidly/shared';

export function skipFor(page: number, pageSize: number) {
  return (page - 1) * pageSize;
}

export function toPage<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Case-insensitive, locale-aware ordering for string sorts. */
export const SORT_COLLATION = { locale: 'en' } as const;

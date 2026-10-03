import type { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  config: ['config'] as const,
  genres: ['genres'] as const,
  movies: ['movies'] as const,
  customers: ['customers'] as const,
  rentals: ['rentals'] as const,
  users: ['users'] as const,
  stats: ['stats'] as const,
};

type Resource = Exclude<keyof typeof queryKeys, 'config'>;

/** Marks every query of the given resources as stale (refetching the ones on screen). */
export function invalidate(queryClient: QueryClient, ...resources: Resource[]) {
  return Promise.all(
    resources.map((resource) => queryClient.invalidateQueries({ queryKey: queryKeys[resource] })),
  );
}
